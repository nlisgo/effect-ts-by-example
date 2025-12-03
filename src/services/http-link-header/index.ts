import { Effect } from 'effect';
import LinkHeaderClass from 'http-link-header';

export class LinkHeader extends Effect.Service<LinkHeader>()('LinkHeader', {
  succeed: LinkHeaderClass,
}) { }
