import {startTransition, useRef, useState, useEffect} from 'react';

import CSS from './SearchBox.module.css';
import CSSCommon from '../../Common.module.css';
import Focus from '../../elements/focus/Focus';
import Vector from '../../elements/vector/Vector';
import {Metadata, Category} from '../Blog';
import {temporalStyle} from '../../../utility/tools';

export type Tag = NonNullable<Metadata['tags']>[number];
export interface SearchData {
  query: string;
  tags?: Metadata['tags'];
}

export default function SearchBox(props: {
  reference: Metadata[] | undefined;
  search: SearchData;
  categories: Metadata['category'][];
  setSearch: SetState<SearchData>;
  setCategories: SetState<Metadata['category'][]>;
}) {
  const [search, setSearch] = useState(props.search);
  const [tags, setTags] = useState(new Set<Tag>());
  const [tagsToggle, setTagsToggle] = useState(false);
  const self = useRef<HTMLDivElement>(null);
  const post = useRef<SVGSVGElement>(null);
  const memo = useRef<SVGSVGElement>(null);
  const cancelExitAnimation = useRef<ReturnType<typeof temporalStyle>>();
  const hasTags = !!tags.size;
  const isTagsSearched = !!search.tags?.length;
  const iconClasses = [
    CSS.Icon,
    CSSCommon.Box,
    !props.reference ? CSSCommon.ButtonDisabled : ''
  ];

  useEffect(() => {
    // Closing the tags menu on focus out
    const handler = (event: MouseEvent) => {
      if (!self.current?.contains(event.target as Element)) {
        setTagsToggle(false);
      }
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    // Gathering the tags
    if (!tags.size && props.reference) {
      for (const metadata of props.reference) {
        if (metadata.tags) {
          for (const tag of metadata.tags) {
            tags.add(tag);
          }
          setTags(new Set(Array.from(tags).sort())); // Sorting alphabetically
        }
      }
    }
  }, [props.reference, tags]);

  useEffect(() => {
    // Syncing the state when it's changed from another component
    setSearch({...props.search});
  }, [props.search.tags]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Handles storing the search queries concurrently. */
  function setSearches(callback: (state: SearchData) => SearchData) {
    setSearch(callback);
    startTransition(() => props.setSearch(callback));
  }

  /** Handles changing the article categories. */
  function categoryHandler(category: Category) {
    if (props.reference)
      props.setCategories(state => {
        if (state.includes(category))
          return state.length > 1
            ? state.filter(cat => cat !== category)
            : state;

        // Playing the exit animation. A delay is needed to
        // avoid overwriting the classes by the render process.
        let element = post;
        let elementClass = CSS.PostIcon;
        if (category === Category.Memo) {
          element = memo;
          elementClass = CSS.MemoIcon;
        }
        window.setTimeout(() => {
          if (element.current) {
            cancelExitAnimation.current && cancelExitAnimation.current();
            cancelExitAnimation.current = temporalStyle(
              element.current.parentElement!,
              elementClass,
              1500
            );
          }
        }, 100);

        return [...state, category];
      });
  }

  return (
    <div ref={self} className={CSS.SearchBox}>
      <div className={tagsToggle ? CSS.BoxWrapperExpand : undefined}>
        <div>
          <input
            className={[CSS.Box, CSSCommon.NoTapHighlight].join(' ')}
            disabled={!props.reference}
            placeholder="Search"
            type="search"
            dir="auto"
            minLength={2}
            maxLength={100}
            value={search.query}
            onChange={event =>
              setSearches(state => ({...state, query: event.target.value}))
            }
          />
          {(search.query || isTagsSearched) && (
            <Focus>
              <Vector
                name="close"
                title="Clear"
                className={[
                  CSS.ClearIcon,
                  hasTags ? '' : CSS.IconMargin,
                  ...iconClasses
                ].join(' ')}
                onClick={() => setSearches(() => ({query: ''}))}
              />
            </Focus>
          )}
          {hasTags && (
            <Focus>
              <Vector
                name="pin"
                title="Tags"
                className={[
                  CSS.IconMargin,
                  isTagsSearched ? CSS.IconSelected : '',
                  ...iconClasses
                ].join(' ')}
                onClick={() => setTagsToggle(state => !state)}
              />
            </Focus>
          )}
        </div>
        {hasTags && tagsToggle && (
          <div className={[CSS.Tags, CSSCommon.Scrollbar].join(' ')}>
            {Array.from(tags).map((tag, idx) => (
              <Focus key={idx}>
                <span
                  className={[
                    CSS.Tag,
                    CSSCommon.NoTapHighlight,
                    search.tags?.includes(tag) ? CSS.TagSelected : ''
                  ].join(' ')}
                  onClick={() =>
                    setSearches(state => ({
                      ...state,
                      tags: state.tags
                        ? state.tags.includes(tag)
                          ? state.tags.filter(_tag => _tag !== tag)
                          : [...state.tags, tag]
                        : [tag]
                    }))
                  }>
                  {tag}
                </span>
              </Focus>
            ))}
          </div>
        )}
      </div>
      <div>
        <Focus>
          <Vector
            ref={post}
            name="article"
            title="Posts"
            className={[
              props.categories.includes(Category.Post) ? CSS.IconSelected : '',
              ...iconClasses
            ].join(' ')}
            onClick={() => categoryHandler(Category.Post)}
          />
        </Focus>
        <Focus>
          <Vector
            ref={memo}
            name="brain"
            title="Memos"
            className={[
              props.categories.includes(Category.Memo) ? CSS.IconSelected : '',
              ...iconClasses
            ].join(' ')}
            onClick={() => categoryHandler(Category.Memo)}
          />
        </Focus>
      </div>
    </div>
  );
}
