import {forwardRef} from 'react';

import CSS from './Link.module.css';
import Focus from '../focus/Focus';

export default forwardRef(function Link(
  props: Override<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    {
      href?: URL | string;
      newWindow?: boolean;
    }
  >,
  ref?: React.ForwardedRef<HTMLAnchorElement>
) {
  const {newWindow, ...attributes} = props;
  if (newWindow) {
    attributes['target'] = '_blank';
    if (!props.rel?.includes('noopener'))
      attributes['rel'] = ((props.rel || '') + ' noopener').trimStart();
  }

  /** Handles clicks on the element by preventing the page reload. */
  function clickHandler(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey) return; // Allowing to open in new tab
    if (props.onClick) {
      event.preventDefault(); // Preventing page reload
      props.onClick(event);
    }
  }

  return (
    <Focus>
      <a
        {...attributes}
        ref={ref}
        className={[props.className || CSS.Link].join(' ')}
        onClick={clickHandler}
        href={
          props.href
            ? typeof props.href !== 'string'
              ? props.href.toString()
              : props.href
            : undefined
        }>
        {props.children}
      </a>
    </Focus>
  );
});
