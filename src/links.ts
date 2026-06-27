import * as vscode from 'vscode';
import { findUrlSpans, URL_RE } from './urls';

export function registerDocumentLinkProvider(): vscode.Disposable {
	return vscode.languages.registerDocumentLinkProvider('notes', {
		provideDocumentLinks(document) {
			const links: vscode.DocumentLink[] = [];
			for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
				const line = document.lineAt(lineIndex).text;
				for (const span of findUrlSpans(line)) {
					links.push(
						new vscode.DocumentLink(
							new vscode.Range(lineIndex, span.start, lineIndex, span.end),
							vscode.Uri.parse(span.url),
						),
					);
				}
			}
			return links;
		},
	});
}

export { URL_RE, findUrlSpans };
