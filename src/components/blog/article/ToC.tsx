import {useRef, useState, useEffect} from 'react';

import CSS from './ToC.module.css';
import CSSCommon from '../../Common.module.css';
import Link from '../../elements/link/Link';
import {scrollIntoHash} from '../../../utility/history';

export default function ToC(props: {
  scrollRef: React.RefObject<HTMLDivElement>;
  articleRef: React.RefObject<HTMLDivElement>;
}) {
  const [highlightInitially, setHighlightInitially] = useState(false);
  const headlines = useRef<NodeListOf<HTMLElement>>();
  const sections = useRef<{indent: number; title: string; id: string}[]>([]);
  const sectionRefs = useRef<{[id: string]: HTMLLIElement | null}>({});

  useEffect(() => {
    // Generating article's Table of Content sections
    if (!sections.current.length) {
      headlines.current = props.articleRef.current!.querySelectorAll(
        'h1, h2, h3, h4, h5, h6'
      );
      for (const headline of headlines.current)
        sections.current.push({
          indent: Number(headline.tagName.charAt(1)),
          title: headline.innerText,
          id: headline.id
        });
      setHighlightInitially(true);
    }
  }, [props.articleRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Attaching the scroll handler
    props.scrollRef.current?.addEventListener('scroll', sectionHighlighter);
    return () => {
      props.scrollRef.current?.removeEventListener(
        'scroll',
        sectionHighlighter
      );
    };
  }, [props.scrollRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Highlighting the visible section at the times when the page opened
    // with URL contains a hashtag referencing the corresponding section.
    if (highlightInitially && Object.keys(sectionRefs.current).length) {
      sectionHighlighter();
      setHighlightInitially(false);
    }
  }, [highlightInitially]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Highlights the section which is visible and is in the front of view. */
  function sectionHighlighter() {
    if (headlines.current) {
      let sectionToHighlight: string | undefined;
      const scrollRef = props.scrollRef.current!;

      if (
        scrollRef.offsetHeight + scrollRef.scrollTop >=
        scrollRef.scrollHeight
      ) {
        // Scroll position is in the end
        sectionToHighlight = headlines.current[headlines.current.length - 1].id;
      } else {
        for (const headline of headlines.current) {
          const rect = headline.getBoundingClientRect();
          if (rect.top - rect.height < 0) {
            sectionToHighlight = headline.id;
            continue;
          }
          break;
        }
      }

      for (const section of Object.values(sectionRefs.current))
        section?.classList.remove(CSS.Highlight);

      if (sectionToHighlight)
        sectionRefs.current[sectionToHighlight]?.classList.add(CSS.Highlight);
    }
  }

  return sections.current.length ? (
    <aside className={CSS.ToC}>
      <nav>
        <ul className={CSSCommon.Scrollbar}>
          {sections.current.map((section, idx) => (
            // `useRef` hook couldn't be used inside a callback or loop,
            // storing elements references into an custom object instead.
            <li
              key={idx}
              ref={element => (sectionRefs.current[section.id] = element)}
              style={{paddingLeft: `${section.indent}rem`}}>
              <Link
                href={`#${section.id}`}
                onClick={() => scrollIntoHash(`#${section.id}`)}>
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  ) : null;
}
