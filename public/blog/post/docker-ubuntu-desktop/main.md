---
id: 3
date: 2023-05-28T20:37:00Z
title: Ubuntu Desktop on Docker Container
description: The instruction to run Ubuntu with GNOME desktop environment on a Docker container and access it with the Remote Desktop client or X forwarding over SSH.
banner: banner.webp
tags:
  - Docker
  - Ubuntu
  - GNOME
  - RDP
  - SSH
...

```dockerfile filename="Dockerfile"
FROM ubuntu:rolling
EXPOSE 3389/tcp
ARG USER=test
ARG PASS=1234
ARG X11Forwarding=false

RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
        apt-get install -y ubuntu-desktop-minimal dbus-x11 xrdp sudo; \
    [ $X11Forwarding = 'true' ] && apt-get install -y openssh-server; \
    apt-get autoremove --purge; \
    apt-get clean; \
    rm /run/reboot-required*
RUN useradd -s /bin/bash -m $USER -p $(openssl passwd "$PASS"); \
    usermod -aG sudo $USER; \
    adduser xrdp ssl-cert; \
    # Setting the required environment variables
    echo 'LANG=en_US.UTF-8' >> /etc/default/locale; \
    echo 'export GNOME_SHELL_SESSION_MODE=ubuntu' > /home/$USER/.xsessionrc; \
    echo 'export XDG_CURRENT_DESKTOP=ubuntu:GNOME' >> /home/$USER/.xsessionrc; \
    echo 'export XDG_SESSION_TYPE=x11' >> /home/$USER/.xsessionrc; \
    # Enabling log to the stdout
    sed -i "s/#EnableConsole=false/EnableConsole=true/g" /etc/xrdp/xrdp.ini; \
    # Disabling system animations and reducing the
    # image quality to improve the performance
    sed -i 's/max_bpp=32/max_bpp=16/g' /etc/xrdp/xrdp.ini; \
    gsettings set org.gnome.desktop.interface enable-animations true; \
    # Listening on wildcard address for X forwarding
    [ $X11Forwarding = 'true' ] && \
        sed -i 's/#X11UseLocalhost yes/X11UseLocalhost no/g' /etc/ssh/sshd_config;

CMD rm -f /var/run/xrdp/xrdp*.pid >/dev/null 2>&1; \
    service dbus restart >/dev/null 2>&1; \
    /usr/lib/systemd/systemd-logind >/dev/null 2>&1 & \
    [ -f /usr/sbin/sshd ] && /usr/sbin/sshd; \
    xrdp-sesman --config /etc/xrdp/sesman.ini; \
    xrdp --nodaemon --config /etc/xrdp/xrdp.ini

```

Store the above `Dockerfile` and run the following command to create the container. The connection from the Remote Desktop client should be initiated with the provided username and password.

```bash
docker build -t ubuntu-gnome --build-arg USER=test --build-arg PASS=1234 .
docker run -d -p 3389:3389 ubuntu-gnome
```

> **Note**  
> To enable X forwarding over SSH, `X11Forwarding=true` should be passed as an argument while creating the container:
>
> ```bash
> docker build -t ubuntu-gnome --build-arg X11Forwarding=true .
> docker run -d -p 3389:3389 -p 22022:22 ubuntu-gnome
> ```
>
> and to open `gnome-terminal` on the local machine: (this also works on `WSL`)
>
> ```bash
> ssh -X -p 22022 test@ip
> gnome-terminal
> ```

<br/>

> **Note**  
> To run `Visual Studio Code` inside the container, after the installation, press `Alt` + `F2` and enter `code --no-sandbox` to open it.
