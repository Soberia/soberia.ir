import Prism from 'prismjs';
import {Children, useEffect, useRef, useState} from 'react';

import CSS from './CodeBlock.module.css';
import CSSCommon from '../../Common.module.css';
import Focus from '../../elements/focus/Focus';
import Vector from '../../elements/vector/Vector';
import {temporalStyle} from '../../../utility/tools';

let loaded = false;

export default function CodeBlock(props: {
  children: React.ReactElement<
    React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
  >;
}) {
  const [languageToggle, setLanguageToggle] = useState(false);
  const [lineNumberToggle, setLineNumberToggle] = useState(false);
  const code = useRef<HTMLElement>(null);
  const copy = useRef<SVGSVGElement>(null);

  const codeProps = Children.only(props.children).props;
  const optionIconClasses = [CSS.OptionIcon, CSSCommon.Box].join(' ');

  let language: string | undefined;
  let filename: string | undefined;
  let lineNumber: string | undefined;
  let lineHighlight: string | undefined;
  if (codeProps.className) {
    let matched = codeProps.className.match(/lang(uage)?-(\w*)/);
    language = matched ? matched[2] : undefined;
    matched = codeProps.className.match(/filename=["'](.*?)["']/i);
    filename = matched ? matched[1] : undefined;
    matched = codeProps.className.match(/line=["'](.*?)["']/i);
    lineNumber = matched ? matched[1] : undefined;
    matched = codeProps.className.match(/highlight=["'](.*?)["']/i);
    lineHighlight = matched ? matched[1] : undefined;

    // Rearranging the highlight line numbers to match
    // the line number at the beginning of code lines.
    if (!lineNumberToggle && lineNumber && lineHighlight) {
      const newLines = [];
      const difference = Number(lineNumber) - 1;
      for (const line of lineHighlight.replace(/s/, '').split(','))
        if (line.includes('-')) {
          const range = line.split('-');
          const newRange = [
            Number(range[0]) - difference,
            Number(range[1]) - difference
          ];
          if (newRange[1] > 0) {
            if (newRange[0] <= 0) {
              newRange[0] = 1;
            }
            newLines.push(`${newRange[0]}-${newRange[1]}`);
          }
        } else {
          const newLine = Number(line) - difference;
          if (newLine > 0) {
            newLines.push(newLine);
          }
        }

      lineHighlight = newLines.join(',');
    }
  }

  useEffect(() => {
    // Highlighting the syntax
    if (!loaded) {
      Prism.manual = true;
      Prism.plugins.customClass.map(CSS);
    }
    Prism.highlightElement(code.current!);
  }, [lineNumberToggle]);

  useEffect(() => {
    // Re-highlighting the lines on window resize
    if (lineHighlight) {
      const handler = () => {
        Prism.highlightElement(code.current!);
      };

      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }
  }, [lineHighlight]);

  /** Handles copying the code block content to the client's clipboard. */
  async function copyHandler() {
    let elementClass = CSS.CopySuccess;
    try {
      await window.navigator.clipboard.writeText(
        typeof codeProps.children === 'string'
          ? codeProps.children
          : codeProps.children!.toString()
      );
    } catch {
      // Client did not grant permission to access the clipboard
      elementClass = CSS.CopyFail;
    }

    temporalStyle(copy.current!.parentElement!, elementClass, 1e3);
  }

  return (
    <Focus>
      <pre
        data-lang={languageToggle ? language : undefined}
        data-filename={filename}
        data-start={lineNumber}
        data-line={lineHighlight}
        className={[
          CSS.CodeBlock,
          CSSCommon.Code,
          language ? `language-${language}` : '',
          lineNumberToggle ? 'line-numbers' : '',
          'match-braces'
        ].join(' ')}
        onKeyDown={event =>
          (event.ctrlKey || event.metaKey) &&
          event.key === 'c' &&
          !window.getSelection()?.toString() && // No text is selected manually
          copyHandler()
        }>
        <code ref={code} className={CSSCommon.Scrollbar}>
          {props.children}
        </code>
        <div className={CSS.Options}>
          <Focus>
            {language && (
              <Vector
                name="syntax"
                title="Language"
                className={optionIconClasses}
                onClick={() => setLanguageToggle(state => !state)}
              />
            )}
          </Focus>
          <Focus>
            <Vector
              name="hashtag"
              title="Line Numbers"
              className={optionIconClasses}
              onClick={() => setLineNumberToggle(state => !state)}
            />
          </Focus>
          <Focus>
            <Vector
              ref={copy}
              name="copy"
              className={optionIconClasses}
              onClick={copyHandler}
            />
          </Focus>
        </div>
      </pre>
    </Focus>
  );
}
