import {memo, useState, useContext, useEffect} from 'react';

import CSS from './Blog.module.css';
import Card from './card/Card';
import Article from './article/Article';
import CSSCommon from '../Common.module.css';
import Focus from '../elements/focus/Focus';
import Vector from '../elements/vector/Vector';
import SearchBox, {SearchData} from './searchbox/SearchBox';
import {historyContext} from '../App';
import {resolveRoute, resolvePath} from '../../utility/history';
import {useFetchFile, FetchFileState} from '../../utility/request';

export enum Category {
  Post = 'post',
  Memo = 'memo'
}

export interface Metadata {
  filename: string;
  dirname?: string;
  category: Category;
  id: number;
  title: string;
  date: Date;
  dateEdited?: Date;
  description?: string;
  banner?: string;
  tags?: string[];
}

const initialTitle = document.title;

export default memo(function Blog() {
  const [history, setHistory] = useContext(historyContext)!;
  const [search, setSearch] = useState<SearchData>({query: ''});
  const [categories, setCategories] = useState<Metadata['category'][]>([
    Category.Post
  ]);
  const [article, setArticle] = useState<
    Omit<ReturnType<typeof useFetchFile>, 'data'>
  >({
    state: undefined,
    reload: () => {}
  });
  const reference = useFetchFile<Metadata[]>(
    `${resolveRoute('base.blog')}/reference.json`,
    'json',
    undefined,
    false,
    true,
    // Converting dates from `ISO 8061` format to `Date`
    data =>
      data.map(metadata => ({
        ...metadata,
        date: new Date(metadata.date),
        dateEdited: metadata.dateEdited && new Date(metadata.dateEdited)
      }))
  );

  useEffect(() => {
    // Clearing the previous state between different articles navigation
    if (history.path === resolveRoute('base.blog')) {
      setArticle(state =>
        state.state !== undefined ? {...state, state: undefined} : state
      );

      document.title = initialTitle; // Resetting the page title
    }
  }, [history.path]);

  /** Checks whether the article's title or tags includes the search query. */
  function filter(title: Metadata['title'], tags: Metadata['tags']) {
    if (search.query.length > 1) {
      const query = search.query.trim().toLowerCase();
      const lowerCaseTitle = title.toLowerCase();
      if (tags?.length)
        for (const tag of tags)
          if (tag.toLowerCase().startsWith(query)) {
            return true;
          }
      for (const word of query.split(' '))
        if (!lowerCaseTitle.includes(word)) {
          return false;
        }
    }

    // Filtering by the selected tags
    if (search.tags?.length) {
      if (tags?.length)
        for (const tag of search.tags) {
          if (tags.includes(tag)) {
            return true;
          }
        }
      return false;
    }

    return true;
  }

  const noArticle = article.state === FetchFileState.Failed;
  const articleIsLoading = article.state === FetchFileState.Loading;
  const hasReference = reference.state === FetchFileState.Succeed;
  const showReference = hasReference && !articleIsLoading && !noArticle;
  let _article: JSX.Element | undefined;
  if (hasReference) {
    const {id, category} = resolvePath(history.path).routes;
    if (id)
      for (const metadata of reference.data!)
        if (metadata.category === category && metadata.id === Number(id)) {
          // Temporally rendering `Article` component as a child of `Blog`
          // component to be able to show the loading indicator. After
          // the article file is downloaded, the `Blog` component's content
          // will be replaced with the `Article` component.
          if (article.state === FetchFileState.Succeed)
            return <Article metadata={metadata} history={history} />;
          else {
            _article = (
              <Article
                metadata={metadata}
                history={history}
                setArticle={setArticle}
              />
            );
            break;
          }
        }
  }

  return (
    <>
      {_article}
      <div className={[CSS.Blog, CSSCommon.Scrollbar].join(' ')}>
        <SearchBox
          reference={reference.data}
          search={search}
          categories={categories}
          setSearch={setSearch}
          setCategories={setCategories}
        />
        <div className={showReference ? undefined : CSS.Wrapper}>
          {showReference ? (
            reference.data!.map(metadata => (
              <Card
                key={`${metadata.category}-${metadata.id}`}
                metadata={metadata}
                hide={
                  !categories.includes(metadata.category) ||
                  !filter(metadata.title, metadata.tags)
                }
                setSearch={setSearch}
                setHistory={setHistory}
              />
            ))
          ) : reference.state === FetchFileState.Failed || noArticle ? (
            <Focus>
              <Vector
                name="refresh"
                className={CSS.Reload}
                onClick={(noArticle ? article : reference).reload}
              />
            </Focus>
          ) : (
            <Vector name="loading" className={CSS.Loading} />
          )}
        </div>
      </div>
    </>
  );
});
