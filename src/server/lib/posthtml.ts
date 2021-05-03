import {Parser, ParserOptions} from '@lancer/ihtml-parser';
import {DynamicContent, ParsedAttribute} from '@lancer/ihtml-parser/lib/Parser';

export type Directive = {
  name: string | RegExp;
  start: string;
  end: string;
};

export type Options = {
  directives?: Directive[];
  customVoidElements?: string[]
} & ParserOptions;

export type Node = NodeText | NodeTag;
export type NodeText = string;
export type NodeTag = {
  tag?: string | boolean;
  attrs?: Attributes;
  render?: RenderInterpolationFn;
  content?: Node[];
};

export type Attributes = Record<string, string | true>;

export type RenderInterpolationFn = (fn: RunFn) => any
export type RunFn = (code: string) => any

const defaultOptions: ParserOptions = {
  lowerCaseTags: false,
  lowerCaseAttributeNames: false,
  decodeEntities: false
};

const defaultDirectives: Directive[] = [
  {
    name: '!doctype',
    start: '<',
    end: '>'
  }
];

export const parseIHTML = (html: string, options: Options = {}): Node[] => {
  const bufArray: Node[] = [];
  const results: Node[] = [];

  function bufferArrayLast(): Node {
    return bufArray[bufArray.length - 1]!;
  }

  function isDirective(directive: Directive, tag: string): boolean {
    if (directive.name instanceof RegExp) {
      const regex = new RegExp(directive.name.source, 'i');

      return regex.test(tag);
    }

    if (tag !== directive.name) {
      return false;
    }

    return true;
  }

  class CustomParser extends Parser {
    isVoidElement(name: string) {
      return options.customVoidElements?.includes(name) || super.isVoidElement(name)
    }
  }

  const parser = new CustomParser({

    onprocessinginstruction(name, data) {
      const directives = defaultDirectives.concat(options.directives ?? []);
      const last: Node = bufferArrayLast();

      for (const directive of directives) {
        const directiveText = directive.start + data + directive.end;

        if (isDirective(directive, name.toLowerCase())) {
          if (last === undefined) {
            results.push(directiveText);
            return;
          }

          if (typeof last === 'object') {
            if (last.content === undefined) {
              last.content = [];
            }

            last.content.push(directiveText);
          }
        }
      }
    },

    oncomment(data) {
      const comment = `<!--${data}-->`;
      const last = bufferArrayLast();

      if (last === undefined) {
        results.push(comment);
        return;
      }

      if (typeof last === 'object') {
        if (last.content === undefined) {
          last.content = [];
        }

        last.content.push(comment);
      }
    },

    onopentag(tag, attrs, iattrs) {
      let buf: Node = {tag};
      const pending: ParsedAttribute[] = []

      if (attrs) buf.attrs = attrs

      if (iattrs) {
        if (!buf.attrs) buf.attrs = {}

        for (let [name, val] of iattrs) {
          if (
            name.length === 1 && typeof name[0] === 'string' &&
            (val.length === 0 || val.length === 1 && typeof val[0] === 'string')
          ) {
            buf.attrs[name[0]] = (val[0] as string || '').replace(/&quot;/g, '"')
          }
          else {
            pending.push([name, val])
          }
        }
      }

      if (pending.length) {
        buf = new AttrInterpolationTag(tag, buf.attrs || (buf.attrs = {}), pending)
      }

      bufArray.push(buf);
    },

    onclosetag() {
      const buf: Node | undefined = bufArray.pop();

      if (buf) {
        const last = bufferArrayLast();

        if (bufArray.length <= 0) {
          results.push(buf);
          return;
        }

        if (typeof last === 'object') {
          if (last.content === undefined) {
            last.content = [];
          }

          last.content.push(buf);
        }
      }
    },

    ontext(text) {
      const last: Node = bufferArrayLast();

      if (last === undefined) {
        results.push(typeof text === 'string' ? text : new TextInterpolationTag(text.code));
        return;
      }

      if (typeof last === 'object') {
        if (last.content && last.content.length > 0 && typeof text === 'string') {
          const lastContentNode = last.content[last.content.length - 1];
          if (typeof lastContentNode === 'string') {
            last.content[last.content.length - 1] = `${lastContentNode}${text}`;
            return;
          }
        }

        if (last.content === undefined) {
          last.content = [];
        }

        last.content.push(typeof text === 'string' ? text : new TextInterpolationTag(text.code));
      }
    },

  }, {...defaultOptions, ...options});

  parser.write(html);
  parser.end();

  return results;
};

class TextInterpolationTag {
  tag = false
  content?: string[]
  constructor(public code: string) {}
  render(fn: RunFn) {
    this.content = [fn(this.code)]
    if (!this.content[0] && typeof this.content[0] !== 'number') {
      this.content = []
    }
  }
  clone() {
    return new TextInterpolationTag(this.code)
  }
}

class AttrInterpolationTag implements NodeTag {
  constructor(
    public tag: string,
    public attrs: Attributes,
    public iattrs: ParsedAttribute[],
    public content?: Node[]
  ) {}
  render(fn: RunFn) {
    this.iattrs.forEach(([name, val]) => {
      let nameParts = renderDC(fn, name)
      let valParts = renderDC(fn, val)

      if (nameParts.length === 1 && !nameParts[0]) {
        // Ignore falsey values
        return
      }
      else if (val.length === 0) {
        // Handle <p {{foo}}> syntax
        const parts = nameParts.join('').split('=')
        nameParts = [parts[0] || '']
        valParts  = [(parts[1] || '').replace(/^['"]/, '').replace(/['"]$/, '')]
      }

      this.attrs[nameParts.join('')] = valParts.join('')
    })
  }
  clone() {
    return new AttrInterpolationTag(this.tag, { ...this.attrs }, this.iattrs, this.content)
  }
}

function renderDC(fn: RunFn, dc: DynamicContent) {
  return dc.map(piece => {
    return typeof piece === 'string' ? piece : fn(piece.code)
  })
}

export const POSTHTML_OPTIONS = {
  parser: parseIHTML,
  customVoidElements: ['page', 'yield', 'include'],
}
