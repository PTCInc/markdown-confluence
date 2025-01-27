import { filter, traverse } from "@atlaskit/adf-utils/traverse";
import { UploadedImageData } from "../Attachments";
import { JSONDocNode } from "@atlaskit/editor-json-transformer";
import { ADFProcessingPlugin, PublisherFunctions } from "./types";
import { ADFEntity } from "@atlaskit/adf-utils/types";
import { ConfluenceAdfFile } from "src/Publisher";
import { basename } from "path";

export interface KrokiChartData {
	name: string;
	data: string;
}

export class KrokiRendererPlugin
	implements
		ADFProcessingPlugin<string[], Record<string, UploadedImageData | null>>
{
	constructor() {}

	extract(adfFile: ConfluenceAdfFile): string[] {
		const krokiNodes = filter(
			adfFile.contents,
			(node) =>
				node.type == "codeBlock" &&
				node?.attrs?.["language"] &&
				node?.attrs?.["language"].startsWith("kroki-"),
		);
		const nodesToUpload = new Array<string>();
		for (var count = 1; count < krokiNodes.length; count++) {
			nodesToUpload.push(
				`${basename(adfFile.absoluteFilePath, ".md")}_${count}.svg`,
			);
		}
		return nodesToUpload;
	}

	async transform(
		krokiNodesToUpload: string[],
		supportFunctions: PublisherFunctions,
	): Promise<Record<string, UploadedImageData | null>> {
		let imageMap: Record<string, UploadedImageData | null> = {};
		for (const imageFile of krokiNodesToUpload) {
			const uploadedContent = await supportFunctions.uploadFile(
				imageFile,
			);
			console.log("Upload content", imageFile, " as ", uploadedContent);

			imageMap = {
				...imageMap,
				[imageFile]: uploadedContent,
			};
		}
		return imageMap;
	}
	load(
		adfFile: ConfluenceAdfFile,
		imageMap: Record<string, UploadedImageData | null>,
	): ConfluenceAdfFile {
		let afterAdf = adfFile.contents as ADFEntity;

		var count = 1;
		afterAdf =
			traverse(afterAdf, {
				codeBlock: (node, _parent) => {
					if (
						node?.attrs?.["language"] &&
						node?.attrs?.["language"].startsWith("kroki-")
					) {
						const mermaidContent = node?.content?.at(0)?.text;
						if (!mermaidContent) {
							return;
						}
						const mermaidFilename = `${basename(
							adfFile.absoluteFilePath,
							".md",
						)}_${count++}.svg`;

						if (!imageMap[mermaidFilename]) {
							return;
						}
						const mappedImage = imageMap[mermaidFilename];
						if (mappedImage) {
							node.type = "mediaSingle";
							node.attrs["layout"] = "center";
							if (node.content) {
								node.content = [
									{
										type: "media",
										attrs: {
											type: "file",
											collection: mappedImage.collection,
											id: mappedImage.id,
											width: mappedImage.width,
											height: mappedImage.height,
										},
									},
								];
							}
							delete node.attrs["language"];
							return node;
						}
					}
					return;
				},
			}) || afterAdf;

		adfFile.contents = afterAdf as JSONDocNode;
		return adfFile;
	}
}
