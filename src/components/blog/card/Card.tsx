import {memo, useRef, useMemo, useState, useEffect} from 'react';

import CSS from './Card.module.css';
import CSSCommon from '../../Common.module.css';
import Link from '../../elements/link/Link';
import {Metadata} from '../Blog';
import {articleUrlGenerator} from '../article/Article';
import {SearchData, Tag} from '../searchbox/SearchBox';
import {temporalStyle} from '../../../utility/tools';
import {History, resolveRoute} from '../../../utility/history';

export default memo(
  function Card(props: {
    metadata: Metadata;
    hide?: boolean;
    setSearch: SetState<SearchData>;
    setHistory: SetState<History>;
  }) {
    const [hide, setHide] = useState(props.hide);
    const self = useRef<HTMLAnchorElement>(null);
    const cancelExitAnimation = useRef<ReturnType<typeof temporalStyle>>();
    const path = useMemo(() => articleUrlGenerator(props.metadata), []); // eslint-disable-line react-hooks/exhaustive-deps
    const tagClasses = [CSS.Tag, CSSCommon.NoTapHighlight].join(' ');

    useEffect(() => {
      // Playing the exit animation
      if (props.hide) {
        if (self.current)
          cancelExitAnimation.current = temporalStyle(
            self.current,
            CSS.Exit,
            250,
            () => setHide(true)
          );
      } else {
        cancelExitAnimation.current && cancelExitAnimation.current();
        setHide(false);
      }
    }, [props.hide]);

    /** Handles selecting the article's tags. */
    function tagHandler<T>(event: React.MouseEvent<T>, tag: Tag) {
      event.preventDefault();
      event.stopPropagation();
      props.setSearch({query: '', tags: [tag]});
    }

    return hide ? null : (
      <Link
        ref={self}
        href={path}
        className={CSS.Card}
        onClick={() => props.setHistory({path})}>
        {props.metadata.banner && (
          <img
            className={CSS.Banner}
            width={16}
            height={9}
            src={`${resolveRoute('base.blog.category', {
              category: props.metadata.category
            })}${props.metadata.dirname ? `/${props.metadata.dirname}` : ''}/${
              props.metadata.banner
            }`}
            alt={props.metadata.title}
          />
        )}
        <h3 className={CSS.Title}>{props.metadata.title}</h3>
        {props.metadata.description && (
          <p className={CSS.Description}>{props.metadata.description}</p>
        )}
        {!!props.metadata.tags?.length && (
          <div className={CSS.Tags}>
            {props.metadata.tags.map((tag, idx) => (
              <span
                key={idx}
                className={tagClasses}
                onClick={event => tagHandler(event, tag)}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    );
  },
  (prevProps, nextProps) => prevProps.hide === nextProps.hide
);
