import { filter, traverse } from "@atlaskit/adf-utils/traverse";
import { UploadedImageData } from "../Attachments";
import { JSONDocNode } from "@atlaskit/editor-json-transformer";
import { ADFEntity } from "@atlaskit/adf-utils/dist/types/types";
import { p } from "@atlaskit/adf-utils/builders";
import { ADFProcessingPlugin, PublisherFunctions } from "./types";
import { ConfluenceAdfFile } from "src/Publisher";

export const ImageUploaderPlugin: ADFProcessingPlugin<
	string[],
	Record<string, UploadedImageData | null>
> = {
	extract(adfFile: ConfluenceAdfFile): string[] {
		const mediaNodes = filter(
			adfFile.contents,
			(node) =>
				node.type === "media" &&
				(node.attrs || {})?.["type"] === "file",
		);

		const imagesToUpload = new Set(
			mediaNodes.map((node) => node?.attrs?.["url"]),
		);

		return Array.from(imagesToUpload);
	},

	async transform(
		imagesToUpload: string[],
		supportFunctions: PublisherFunctions,
	): Promise<Record<string, UploadedImageData | null>> {
		let imageMap: Record<string, UploadedImageData | null> = {};

		for (const imageUrl of imagesToUpload.values()) {
			const filename = imageUrl.split("://")[1];
			if (!filename) {
				continue;
			}
			const uploadedContent = await supportFunctions.uploadFile(filename);

			imageMap = {
				...imageMap,
				[imageUrl]: uploadedContent,
			};
		}

		return imageMap;
	},

	load(
		adf: JSONDocNode,
		imageMap: Record<string, UploadedImageData | null>,
	): JSONDocNode {
		let afterAdf = adf as ADFEntity;

		afterAdf =
			traverse(afterAdf, {
				media: (node, _parent) => {
					if (node?.attrs?.["type"] === "file") {
						if (!imageMap[node?.attrs?.["url"]]) {
							return;
						}
						const mappedImage = imageMap[node.attrs["url"]];
						if (mappedImage) {
							node.attrs["collection"] = mappedImage.collection;
							node.attrs["id"] = mappedImage.id;
							node.attrs["width"] = mappedImage.width;
							node.attrs["height"] = mappedImage.height;
							delete node.attrs["url"];
							return node;
						}
					}
					return;
				},
			}) || afterAdf;

		afterAdf =
			traverse(afterAdf, {
				mediaSingle: (node, _parent) => {
					if (!node || !node.content) {
						return;
					}
					if (
						node.content.at(0)?.attrs?.["url"] !== undefined &&
						(
							node.content.at(0)?.attrs?.["url"] as string
						).startsWith("file://")
					) {
						return p("Invalid Image Path");
					}
					return;
				},
			}) || afterAdf;

		return afterAdf as JSONDocNode;
	},
};
