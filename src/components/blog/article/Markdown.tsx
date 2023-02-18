import Parser, {MarkdownToJSX} from 'markdown-to-jsx';
import {
  Fragment,
  Children,
  memo,
  isValidElement,
  cloneElement,
  createElement
} from 'react';

import CSS from './Markdown.module.css';
import CodeBlock from './CodeBlock';
import CSSCommon from '../../Common.module.css';
import CSSFocus from '../../elements/focus/Focus.module.css';
import CSSLink from '../../elements/link/Link.module.css';
import Link from '../../elements/link/Link';
import Vector from '../../elements/vector/Vector';
import {articleUrlGenerator} from './Article';
import {Metadata} from '../Blog';
import {temporalStyle, isRelativeUrl} from '../../../utility/tools';

type SourceProps = React.SourceHTMLAttributes<HTMLSourceElement>;
type CreateElementOverride = Parameters<
  NonNullable<MarkdownToJSX.Options['createElement']>
>;

export default memo(
  function Markdown(props: {data: string; metadata: Metadata; path: string}) {
    const path = props.path;

    /** Handles copying the headline hashtag hyperlinks to the client's clipboard. */
    async function hashtagLinkHandler(id: string) {
      let elementClass = CSS.AnchorSuccess;
      const headline = document.getElementById(id)!;
      headline.scrollIntoView({behavior: 'smooth'});

      try {
        await window.navigator.clipboard.writeText(
          `${`${window.location.origin}${articleUrlGenerator(
            props.metadata
          )}`}#${id}`
        );
      } catch {
        // Client did not grant permission to access the clipboard
        elementClass = CSS.AnchorFail;
      }

      temporalStyle(
        headline.querySelector(`.${CSS.Anchor}`) as HTMLElement,
        elementClass,
        1e3
      );
    }

    /**
     * Handles overwriting the elements properties.
     *
     * All the relative links and media files URL will be converted
     * to an absolute URL.
     */
    function overrideHandler(
      type: CreateElementOverride[0],
      props: {[key: string]: any},
      children: CreateElementOverride[2]
    ) {
      if (typeof type === 'string') {
        if (type === 'a') {
          type = Link;
          props.newWindow = true;
          props.className = [CSS.Link, CSSLink.Link].join(' ');
          if (
            isRelativeUrl(
              (props as React.AnchorHTMLAttributes<HTMLAnchorElement>).href!
            )
          )
            props.href = `${path}/${props.href}`;
        } else if (type === 'img') {
          props.className = CSS.Media;
          if (
            isRelativeUrl(
              (props as React.ImgHTMLAttributes<HTMLImageElement>).src!
            )
          )
            props.src = `${path}/${props.src}`;
        } else if (type === 'picture' || type === 'video' || type === 'audio') {
          props.className = CSS.Media;
          let src: 'src' | 'srcSet' = 'src';
          if (type === 'picture') {
            src = 'srcSet';
          } else {
            props.className = [props.className, CSSFocus.Focus].join(' ');
            if (props['data-gif']) {
              props.loop = true;
              props.muted = true;
              props.autoPlay = true;
              props.playsInline = true;
              props.preload = 'auto';
            } else {
              props.controls = true;
              props.preload = 'metadata';
            }
            if (src in props && isRelativeUrl(props.src))
              props.src = `${path}/${props.src}`;
          }
          children = (
            <>
              {Children.map(children, child =>
                isValidElement(child) &&
                child.type === 'source' &&
                isRelativeUrl((child.props as SourceProps)[src]!)
                  ? cloneElement(child, {
                      [src]: `${path}/${(child.props as SourceProps)[src]}`
                    } as React.SourceHTMLAttributes<HTMLSourceElement>)
                  : child
              )}
            </>
          );
        } else if (type === 'code') {
          if (!/lang(uage)?-/.test(props.className))
            // Only inline `code` elements and not the ones from the
            // `CodeBlock` component which are wrapped inside a `pre` tag
            props.className = [CSSCommon.Code, CSS.Code].join(' ');
        } else if (type === 'blockquote') {
          props.className = CSS.Quote;
          if (Array.isArray(children) && children[0].type === 'p') {
            const _children = children[0].props.children;
            if (Array.isArray(_children)) {
              const __children = _children[0]?.props?.children;
              const child = (
                Array.isArray(__children) ? __children : _children
              )[0];
              if (typeof child === 'string') {
                const text = child.toLowerCase();
                const isNote = text === 'note';
                if (isNote || text === 'warning') {
                  let className = CSS.QuoteNote;
                  let sign = '🚩';
                  if (!isNote) {
                    className = CSS.QuoteWarning;
                    sign = '⚠️';
                  }
                  _children[0] = (
                    <strong key={text} className={className}>
                      <span className={CSS.QuoteSign}>{sign}</span>
                      {` ${text.charAt(0).toUpperCase()}${text.slice(1)}`}
                    </strong>
                  );
                }
              }
            }
          }
        } else if (type.match(/^h[123456]$/)) {
          props.className = CSS.SectionTitle;
          props.onClick = () => hashtagLinkHandler(props.id);
          children = (
            <>
              <Vector name="anchor" className={CSS.Anchor} />
              {children}
            </>
          );
        }
      }

      return createElement(type, props, children);
    }

    return (
      <Parser
        options={{
          wrapper: Fragment,
          overrides: {pre: CodeBlock},
          createElement: overrideHandler
        }}>
        {props.data}
      </Parser>
    );
  },
  () => true
);
