import {useEffect, useRef, useState} from 'react';

import CSS from './Article.module.css';
import ToC from './ToC';
import Markdown from './Markdown';
import CSSBlog from '../Blog.module.css';
import CSSCommon from '../../Common.module.css';
import Link from '../../elements/link/Link';
import Vector from '../../elements/vector/Vector';
import Analytics from '../../../utility/analytics';
import {Metadata} from '../Blog';
import {useNavigationAutoHide} from '../../navigation/Navigation';
import {metaTagUpdater} from '../../../utility/tools';
import {useFetchFile, FetchFileState} from '../../../utility/request';
import {resolveRoute, scrollIntoHash, History} from '../../../utility/history';

/** Generates an URL from the given article's metadata. */
export function articleUrlGenerator(metadata: Metadata) {
  return resolveRoute('base.blog.category.id.title', {
    category: metadata.category,
    id: String(metadata.id),
    title: metadata.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '') // Illegal characters
      .replace(/-+/g, '-') // Duplicate dashes
      .replace(/^-/, '') // Leading dash
      .replace(/-$/, '') // Trailing dash
  });
}

export default function Article(props: {
  metadata: Metadata;
  history: History;
  setArticle?: SetState<Omit<ReturnType<typeof useFetchFile>, 'data'>>;
}) {
  const [dateToggle, setDateToggle] = useState(false);
  const self = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const path = `${resolveRoute('base.blog.category', {
    category: props.metadata.category
  })}${props.metadata.dirname ? `/${props.metadata.dirname}` : ''}`;
  const article = useFetchFile(
    `${path}/${props.metadata.filename}`,
    'text',
    undefined,
    false,
    true,
    data => data.replace(/^---.*?\.\.\./s, '') // Removing YAML formatted metadata
  );

  const metadata = props.metadata;
  const hasArticle = article.state === FetchFileState.Succeed;
  const timeFormat = dateToggle ? 'toLocaleString' : 'toLocaleDateString';
  const infoIconsClasses = [CSS.InfoIcons, CSSCommon.Box].join(' ');

  useNavigationAutoHide(self);

  useEffect(() => {
    if (props.setArticle)
      props.setArticle({state: article.state, reload: article.reload});
  }, [article]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Scrolling to the hashtag hyperlinks
    if (hasArticle) {
      scrollIntoHash();
    }
  }, [hasArticle]);

  useEffect(() => {
    // Updating the meta tags
    metaTagUpdater(
      metadata.title,
      metadata.description,
      metadata.banner && `${window.location.origin}${path}/${metadata.banner}`,
      `${window.location.origin}${articleUrlGenerator(metadata)}`
    );
  }, [metadata, path]);

  /** Handles sharing the page's URL via Web Share API. */
  async function shareHandler() {
    if (window.navigator.share) {
      try {
        await window.navigator.share({
          url: `${window.location.origin}${articleUrlGenerator(metadata)}`,
          text: metadata.description,
          title: metadata.title
        });
      } catch {
        // Client did not grant permission
        return;
      }

      new Analytics().shareEvent(
        metadata.title,
        metadata.category,
        String(metadata.id)
      );
    }
  }

  return hasArticle ? (
    <div ref={self} className={[CSSBlog.Blog, CSSCommon.Scrollbar].join(' ')}>
      <div className={CSS.Wrapper}>
        <header className={CSS.Header}>
          {metadata.banner && (
            <img
              className={CSS.Banner}
              width={16}
              height={9}
              src={`${path}/${metadata.banner}`}
              alt={metadata.title}
            />
          )}
          <section className={CSS.Info}>
            <Vector
              name="share"
              className={infoIconsClasses}
              onClick={shareHandler}
            />
            <div className={CSS.Date}>
              <Vector
                name="clock"
                className={infoIconsClasses}
                onClick={() => setDateToggle(state => !state)}
              />
              <time
                dateTime={(metadata.dateEdited || metadata.date).toISOString()}>
                {metadata.date[timeFormat]()}
                {metadata.dateEdited &&
                  ` (Last Update: ${metadata.dateEdited[timeFormat]()})`}
              </time>
            </div>
          </section>
        </header>
        <main className={CSS.Main}>
          <div>
            <h1 className={CSS.Title}>{metadata.title}</h1>
            <article ref={articleRef} className={CSS.Article}>
              <Markdown data={article.data!} metadata={metadata} path={path} />
            </article>
          </div>
          <ToC scrollRef={self} articleRef={articleRef} />
        </main>
        <footer className={CSS.Footer}>
          &copy; {new Date().getFullYear()} Soberia
          <br />
          The content of this blog is licensed under &nbsp;
          <Link
            href="http://creativecommons.org/licenses/by/4.0/"
            rel="license noopener noreferrer"
            newWindow>
            CC BY 4.0
          </Link>
        </footer>
      </div>
    </div>
  ) : null;
}
