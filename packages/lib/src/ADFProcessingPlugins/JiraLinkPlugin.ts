import { traverse } from "@atlaskit/adf-utils/traverse";
import { JSONDocNode } from "@atlaskit/editor-json-transformer";
import { ADFProcessingPlugin, PublisherFunctions } from "./types";
import { ADFEntity, EntityParent } from "@atlaskit/adf-utils/types";
import { ConfluenceAdfFile } from "src/Publisher";
import { text, inlineCard } from "@atlaskit/adf-utils/builders";
export interface JiraLink {
	issueId: string;
}

const JIRA_RE = "^(.*?)[:space:]?JIRA ?#? ?: ?([A-Z]+-[0-9]+)[:space:]?(.*?)$";
export class JiraLinkPlugin implements ADFProcessingPlugin<string, string> {
	constructor(private jiraUrl: string) {}

	extract(_adfFile: ConfluenceAdfFile): string {
		return "no-op";
	}

	async transform(
		items: string,
		_supportFunctions: PublisherFunctions,
	): Promise<string> {
		return items;
	}

	load(adfFile: ConfluenceAdfFile, _transformed: string): ConfluenceAdfFile {
		let afterAdf = adfFile.contents as ADFEntity;
		const nodeMatches: Array<{
			parent: EntityParent;
			node: ADFEntity;
			matches: RegExpMatchArray;
		}> = [];
		afterAdf =
			traverse(afterAdf, {
				text: (node, parent) => {
					if (!node.text) return;
					const matches = node.text?.match(JIRA_RE);
					if (!matches) return;

					nodeMatches.push({
						parent: parent,
						node: node,
						matches: matches,
					});
				},
			}) || afterAdf;
		for (const nodeMatch of nodeMatches) {
			if (nodeMatch.parent.node && nodeMatch.parent.node.content) {
				let pos = -1;
				for (
					let nodeCount = 0;
					nodeCount < nodeMatch.parent.node.content.length;
					nodeCount++
				) {
					const node = nodeMatch.parent.node.content[nodeCount];
					if (
						node &&
						node.type === nodeMatch.node.type &&
						node.text === nodeMatch.node.text
					) {
						pos = nodeCount;
						break;
					}
				}
				this.insertJiraReference(
					nodeMatch.parent.node.content as ADFEntity[],
					nodeMatch.node,
					nodeMatch.matches,
					pos,
				);
			}
		}
		adfFile.contents = afterAdf as JSONDocNode;
		return adfFile;
	}

	private insertJiraReference(
		parent: ADFEntity[],
		node: ADFEntity,
		matches: RegExpMatchArray,
		pos: number,
	) {
		// So we have a parent node whose children include a JIRA ref
		if (node.text) {
			if (parent) {
				if (matches[1]) {
					parent.splice(pos++, 0, text(matches[1]));
				}
				parent.splice(
					pos++,
					1,
					inlineCard({
						url: `${this.jiraUrl}/browse/${matches[2]}`,
					}),
				);
				if (matches[3]) {
					parent.splice(pos++, 0, text(matches[3]));
					const newMatches = matches[3].match(JIRA_RE);
					if (newMatches) {
						this.insertJiraReference(
							parent,
							parent[pos - 1] as ADFEntity,
							newMatches,
							pos - 1,
						);
					}
				}
			}
		}
	}
}
