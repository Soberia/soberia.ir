import {cloneElement, isValidElement} from 'react';

import CSS from './Focus.module.css';

export default function Focus(props: {
  children: React.ReactNode;
  tabIndex?: HTMLElement['tabIndex'];
}) {
  if (isValidElement(props.children)) {
    const children = props.children;
    return cloneElement(children, {
      tabIndex: props.tabIndex || 0,
      className: [children.props.className || '', CSS.Focus].join(' '),
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (children.props.onKeyDown) {
          children.props.onKeyDown(event);
        } else if (event.key === 'Enter') {
          event.stopPropagation();
          children.props?.onClick(event);
        }
      }
    } as React.HTMLAttributes<HTMLElement>);
  }

  return null;
}
