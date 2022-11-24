import {Fragment, memo, useRef} from 'react';

import CSS from './Switch.module.css';
import Focus from '../focus/Focus';
import CSSCommon from '../../Common.module.css';

export default memo(function Switch(props: {
  on: boolean;
  disabled?: boolean;
  callback: () => void;
  /** The delay between clicks after the first click. */
  clickDelay?: number;
  className?: HTMLDivElement['className'];
}) {
  const lastClickTime = useRef(0);
  const Wrapper = props.disabled ? Fragment : Focus;

  /** Handles clicks on the element by ignoring repetitive clicks. */
  function clickHandler() {
    if (!props.disabled) {
      const currentTime = Date.now();
      if (currentTime - lastClickTime.current > (props.clickDelay || 0)) {
        lastClickTime.current = currentTime;
        props.callback();
      }
    }
  }

  return (
    <Wrapper>
      <div
        role="switch"
        aria-checked={props.on}
        className={[
          CSS.Switch,
          CSSCommon.NoTapHighlight,
          props.className || ''
        ].join(' ')}
        onClick={clickHandler}>
        <div className={[CSS.Handle, props.on ? CSS.On : ''].join(' ')} />
      </div>
    </Wrapper>
  );
});
