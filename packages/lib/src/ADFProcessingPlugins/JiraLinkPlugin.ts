import { traverse } from "@atlaskit/adf-utils/traverse";
import { JSONDocNode } from "@atlaskit/editor-json-transformer";
import { ADFProcessingPlugin, PublisherFunctions } from "./types";
import { ADFEntity, EntityParent } from "@atlaskit/adf-utils/types";
import { ConfluenceAdfFile } from "src/Publisher";
export interface JiraLink {
	issueId: string;
}

const JIRA_RE = "JIRA ?#? ?: ?([A-Z]+-[0-9]+)";
const FULL_JIRA_RE = new RegExp(`^[:space"]?${JIRA_RE}[:space"]?$`);
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
					console.log(matches);
					if (!matches) return;
					console.log("JIRA: found ", node.text);

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
						console.log("MATCH", node, nodeCount);
						pos = nodeCount;
						break;
					}
				}
				console.log("A:", nodeMatch.parent.node, nodeMatch.node, pos);
				console.log("B:", pos, nodeMatch.parent.node);
				// So we have a parent node whose children include a JIRA ref
				console.log("1: ", FULL_JIRA_RE, nodeMatch.node);
				const node = nodeMatch.node;
				if (node.text) {
					if (FULL_JIRA_RE.test(node.text)) {
						nodeMatch.node.type = "inlineCard";
						nodeMatch.node.attrs = {
							url: `${this.jiraUrl}/browse/${nodeMatch.matches[1]}`,
						};
						delete nodeMatch.node.marks;
						delete nodeMatch.node.text;
						console.log(nodeMatch.node);
						nodeMatch.parent.node.content[pos] = nodeMatch.node;
					}
				}
			}
		}
		if (afterAdf.content && afterAdf.content[0]) {
			console.log(afterAdf.content[0].content);
		}
		adfFile.contents = afterAdf as JSONDocNode;
		return adfFile;
	}
}
