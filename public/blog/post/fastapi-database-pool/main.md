---
id: 1
date: 2022-08-15T21:00:00Z
title: MySQL database connection pool for FastAPI
description: The connection pool is a cache mechanism that improves the performance and reduces the latency by keeping the connections in the idle state and reuses them whenever they're needed.
banner: banner.webp
tags:
  - Python
  - FastAPI
  - MySQL
  - MySQLdb
  - mysqlclient
  - mysqlclient-pool
  - Connection Pool
...

## Introduction

The connection pool is a cache mechanism that improves the performance and reduces the latency by keeping the connections in the idle state and reuses them whenever they're needed.

The database connection pool is a great option for the web applications which usually only needs a database connection for fraction of a second in the given request. By using a connection pool, each request acquires a connection form the pool, doing the query and returns the connection back to the pool instead of opening and closing the connection each time over and over again.

## Which database driver?

[`mysqlclient`](https://github.com/PyMySQL/mysqlclient) database connector is still the fastest driver to access the MySQL database server and even faster than asynchronous versions like [`aiomysql`](https://github.com/aio-libs/aiomysql) or [`asyncmy`](https://github.com/long2ice/asyncmy) according to [this benchmark](https://github.com/long2ice/asyncmy#benchmark).

Performance-wise (BTW, I like [The Apartment](https://www.imdb.com/title/tt0053604/) by Billy Wilder), we should choose `mysqlclient`. But unlike the other two, `mysqlclient` doesn't have a built-in connection pool! We need a third party library for that.

Strangely enough, I created [`mysqlclient-pool`](https://github.com/Soberia/mysqlclient-pool) as a connection pool for `mysqlclient`! However I won't recommend to use it in the production environment. Both [`DBUtils`](https://github.com/WebwareForPython/DBUtils) and [`SQLAlchemy`](https://github.com/sqlalchemy/sqlalchemy) have a connection pool support with more advanced options and better failover mechanism which can be used along with `mysqlclient`.

For the sake of this article, we're going to use `mysqlclient-pool`.

## When connection pool isn't needed?

If all of your [Paths](https://fastapi.tiangolo.com/tutorial/first-steps/#path) and its [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/), [Sub-dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/sub-dependencies/) and [Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) that need to access the database are coroutines (i.e. defined as `async def`), then you don't need a connection pool for your `FastAPI` app and you can use only one connection for all your paths. Otherwise, all of the mentioned elements [will run in a thread pool](https://fastapi.tiangolo.com/async/#very-technical-details) and you need a connection per thread because `mysqlclient` [aren't thread safe at the connection level](https://mysqlclient.readthedocs.io/user_guide.html#mysqldb).

But remember you must also avoid context switch between your queries. You can't use threads in those mentioned elements that need to access the database.
All your queries should executed synchronously, you can't use `await` between them:

```python
cursor.execute("INSERT INTO ...")
await sleep(1)
cursor.execute("UPDATE ...")
```

For asynchronous drivers you always need a connection pool.

## Using the connection pool with `FastAPI`

Install the connection pool:

```bash
pip install mysqlclient-pool
```

### Creating the pool

We leverage the `startup` event to instantiate the connection pool and `shutdown` event to close the pool on application's exit. The pool will be stored on the `state` attribute of `app` instance and later can be accessed through `Request` interface on other places.

```python
from fastapi import FastAPI
from mysqlclient_pool import ConnectionPool

app = FastAPI()


@app.on_event("startup")
def create_pool() -> None:
    app.state.pool = ConnectionPool(
        {
            "unix_socket": "/var/run/mysqld/mysqld.sock",
            "host": "localhost",
            "port": 3306,
            "user": "root",
            "password": "...",
            "database": "mysql"
        },
        size=20,  # minimum size of the connections
        fillup=False  # create an empty pool initially
    )


@app.on_event("shutdown")
def cleanup() -> None:
    app.state.pool.close()
```

If you want to be sure MySQL server is up and running before your web application's startup (e.g. using remote MySQL server or a Docker container), you can set `fillup` parameter to `True` and wrap `ConnectionPool()` in `Try ... Except` block and listen for the `TimeoutError` and retry the procedure with a loop until it gets connected.

### Using the pool

Now you can access the database in your paths simply with `request` parameter:

```python
from fastapi import Request


@app.get("/ping")
async def ping(request: Request) -> tuple[int]:
    with request.app.state.pool.fetch() as cursor:
        cursor.execute("SELECT 1")
        return cursor.fetchone()
```

But remember you can't share a connection between the different threads. `BackgroundTasks` uses a thread pool underneath for plain function tasks. If you pass the `cursor` to the `update_counter()` background task like the below example, then when `update_counter()` gets called, it'll use a connection which already returned to the pool by the `counter()` path operation function and chances are high that another part of your application will take that connection from the pool and _oops!_ you're using **the same connection at the same time** from different threads.

```python
from fastapi import BackgroundTasks
from MySQLdb.cursors import Cursor, DictCursor


def update_counter(cursor: Cursor | DictCursor) -> None:
    cursor.execute("UPDATE counter SET value = value + 1")


@app.get("/counter")
async def counter(request: Request, background: BackgroundTasks) -> int:
    with request.app.state.pool.fetch() as cursor:
        background.add_task(update_counter, cursor)
        cursor.execute("SELECT value FROM counter")
        return cursor.fetchone()[0]
```

You have to pass the `pool` itself:

```python
def update_counter(pool: ConnectionPool) -> None:
    with pool.fetch() as cursor:
        cursor.execute("UPDATE counter SET value = value + 1")


@app.get("/counter")
async def counter(request: Request, background: BackgroundTasks) -> int:
    with (pool := request.app.state.pool).fetch() as cursor:
        cursor.execute("SELECT value FROM counter")
        value = cursor.fetchone()[0]

    background.add_task(update_counter, pool)
    return value
```

### Handling the exceptions

The best way to deal with the exceptions is with a global exception handler. We can use `exception_handler()` decorator to attach a handler function for as many exceptions we want. By this way, we don't have to repeat our selves by handling the exceptions for each path over and over again. We still have access to the pool in here by the `Request` interface.

In here, we handle the exceptions and return the error code as `JSON` response to the client.

```python
from fastapi.responses import JSONResponse
from MySQLdb._exceptions import OperationalError, ProgrammingError


@app.exception_handler(OperationalError)
@app.exception_handler(ProgrammingError)
@app.exception_handler(ConnectionPool.OverflowError)
@app.exception_handler(ConnectionPool.DrainedError)
async def database_exception_handler(
    request: Request, exception: Exception
) -> JSONResponse:
    content = {"code": 0, "message": "Something Went Wrong"}
    try:
        raise exception
    except (OperationalError, ProgrammingError):
        # Handling MySQL errors
        pass
    except ConnectionPool.DrainedError:
        # The pool can't provide a connection anymore
        # because it can't access the database server.
        content["code"] = 1
        content["message"] = "Database Server Is Not Available"
    except ConnectionPool.OverflowError:
        # Maximum permitted number of simultaneous connections is exceeded.
        content["code"] = 2
        content["message"] = "Database Server Is Busy"

    # We still have access to the pool in here
    if request.app.state.pool.closed:
        pass

    return JSONResponse(status_code=500, content=content)
```
