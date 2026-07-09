import { BaseFormatConverter, parseMarkdown, toPlainText, type Root } from "chat";

/**
 * Kakao simpleText renders no markdown — inbound utterances are plain text,
 * and outbound replies must be plain text too (markup shows up literally).
 */
export class KakaoFormatConverter extends BaseFormatConverter {
  toAst(platformText: string): Root {
    return parseMarkdown(platformText);
  }

  fromAst(ast: Root): string {
    return toPlainText(ast);
  }
}
