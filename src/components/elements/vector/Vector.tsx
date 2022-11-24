import {memo, forwardRef} from 'react';

import CSSCommon from '../../Common.module.css';
import {ReactComponent as Anchor} from './anchor.svg';
import {ReactComponent as Article} from './article.svg';
import {ReactComponent as Blog} from './blog.svg';
import {ReactComponent as Brain} from './brain.svg';
import {ReactComponent as Clock} from './clock.svg';
import {ReactComponent as Close} from './close.svg';
import {ReactComponent as Copy} from './copy.svg';
import {ReactComponent as Game} from './game.svg';
import {ReactComponent as Hashtag} from './hashtag.svg';
import {ReactComponent as Home} from './home.svg';
import {ReactComponent as Info} from './info.svg';
import {ReactComponent as Lamp} from './lamp.svg';
import {ReactComponent as Loading} from './loading.svg';
import {ReactComponent as Logo} from './logo.svg';
import {ReactComponent as Pin} from './pin.svg';
import {ReactComponent as Refresh} from './refresh.svg';
import {ReactComponent as Share} from './share.svg';
import {ReactComponent as Star} from './star.svg';
import {ReactComponent as Syntax} from './syntax.svg';

const SVGs = {
  anchor: {component: Anchor},
  article: {component: Article},
  blog: {component: Blog},
  brain: {component: Brain},
  clock: {component: Clock},
  close: {component: Close},
  copy: {component: Copy, title: 'Copy'},
  game: {component: Game},
  hashtag: {component: Hashtag},
  home: {component: Home},
  info: {component: Info},
  lamp: {component: Lamp},
  loading: {component: Loading, title: 'Loading...'},
  logo: {component: Logo},
  pin: {component: Pin},
  refresh: {component: Refresh, title: 'Refresh'},
  share: {component: Share, title: 'Share'},
  star: {component: Star},
  syntax: {component: Syntax}
};

export default memo(
  forwardRef(function Vector(
    props: Override<
      React.HTMLAttributes<HTMLDivElement>,
      {
        name: keyof typeof SVGs;
        svgProps?: React.SVGProps<SVGSVGElement>;
      }
    >,
    ref?: React.ForwardedRef<SVGSVGElement>
  ) {
    // @ts-expect-error
    const {component: SVG, title} = SVGs[props.name];
    const {name, svgProps, ...attributes} = props;

    return (
      <div
        {...attributes}
        className={[props.className || '', CSSCommon.NoTapHighlight].join(' ')}
        title={props.title || title}>
        <SVG {...svgProps} ref={ref} />
      </div>
    );
  })
);
