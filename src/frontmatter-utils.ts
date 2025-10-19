import { MovieData, KinopoiskMovieFillerSettings } from "./types";

export class FrontmatterUtils {
	static extractKinopoiskUrl(content: string): string | null {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return null;

		const frontmatter = frontmatterMatch[1];
		const kinopoiskMatch = frontmatter.match(/^Kinopoisk:\s*(.+)$/m);
		return kinopoiskMatch ? kinopoiskMatch[1].trim() : null;
	}

	static updateFrontmatter(
		content: string,
		movieData: MovieData,
		overwriteExisting = false,
		settings?: KinopoiskMovieFillerSettings
	): string {
		const frontmatterMatch = content.match(/^(---\n)([\s\S]*?)(\n---)/);
		if (!frontmatterMatch) {
			const newFrontmatter = this.createFrontmatter(movieData, settings);
			const posterImage = this.getPosterImage(movieData, settings);
			return `${newFrontmatter}\n\n${posterImage}${content}`;
		}

		const [fullMatch, startDelimiter, frontmatter, endDelimiter] =
			frontmatterMatch;
		const restOfContent = content.substring(fullMatch.length);

		const updatedFrontmatter = this.updateExistingFrontmatter(
			frontmatter,
			movieData,
			overwriteExisting,
			settings
		);
		const posterImage = this.getPosterImage(movieData, settings);
		return `${startDelimiter}${updatedFrontmatter}${endDelimiter}\n\n${posterImage}${restOfContent}`;
	}

	private static createFrontmatter(
		movieData: MovieData,
		settings?: KinopoiskMovieFillerSettings
	): string {
		const lines: string[] = [];

		lines.push(`Title: "${movieData.title.replace(/"/g, '\\"')}"`);
		lines.push(`Year: ${movieData.year}`);
		lines.push(`Duration: ${movieData.duration} мин`);

		if (movieData.description) {
			lines.push(
				`Description: "${movieData.description
					.replace(/"/g, '\\"')
					.replace(/\n/g, "\\n")}"`
			);
		}

		if (movieData.directors.length > 0) {
			lines.push(`Author:`);
			movieData.directors.forEach((director) => {
				lines.push(`  - ${director}`);
			});
		}

		const allTags = [...movieData.genres, ...movieData.countries];
		if (allTags.length > 0) {
			lines.push(`tags:`);
			allTags.forEach((tag) => {
				lines.push(`  - ${tag}`);
			});
		}

		lines.push(`Kinopoisk_ID: ${movieData.kinopoiskId}`);
		lines.push(`Kinopoisk_Rating: ${movieData.ratingKinopoisk}`);

		// Добавляем постер в frontmatter только если не отображаем как изображение
		if (
			movieData.posterUrl &&
			(!settings?.displayPosterAsImage || !settings?.includePoster)
		) {
			lines.push(`Poster: ${movieData.posterUrl}`);
		}

		return `---\n${lines.join("\n")}\n---`;
	}

	private static updateExistingFrontmatter(
		frontmatter: string,
		movieData: MovieData,
		overwriteExisting: boolean,
		settings?: KinopoiskMovieFillerSettings
	): string {
		const lines = frontmatter.split("\n");
		const updatedLines: string[] = [];
		const processedFields = new Set<string>();

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();

			if (!trimmedLine) {
				updatedLines.push(line);
				continue;
			}

			const fieldName = this.getFieldName(trimmedLine);
			if (
				fieldName &&
				this.shouldUpdateField(fieldName, overwriteExisting)
			) {
				processedFields.add(fieldName);

				const newValue = this.getFieldValue(
					fieldName,
					movieData,
					settings
				);
				if (newValue !== null) {
					updatedLines.push(newValue);

					if (fieldName === "Author" || fieldName === "tags") {
						while (
							i + 1 < lines.length &&
							lines[i + 1].startsWith("  ")
						) {
							i++;
						}
					}
				} else {
					updatedLines.push(line);
				}
			} else {
				updatedLines.push(line);
			}
		}

		const newFields = this.getNewFields(
			movieData,
			processedFields,
			settings
		);
		updatedLines.push(...newFields);

		return updatedLines.join("\n");
	}

	private static getFieldName(line: string): string | null {
		const match = line.match(/^([^:]+):/);
		return match ? match[1].trim() : null;
	}

	private static shouldUpdateField(
		fieldName: string,
		overwriteExisting: boolean
	): boolean {
		if (overwriteExisting) return true;

		const alwaysUpdate = [
			"Title",
			"Year",
			"Duration",
			"Description",
			"Author",
			"tags",
			"Kinopoisk_ID",
			"Kinopoisk_Rating",
			"Poster",
		];
		return alwaysUpdate.includes(fieldName);
	}

	private static getFieldValue(
		fieldName: string,
		movieData: MovieData,
		settings?: KinopoiskMovieFillerSettings
	): string | null {
		switch (fieldName) {
			case "Title":
				return `Title: "${movieData.title.replace(/"/g, '\\"')}"`;
			case "Year":
				return `Year: ${movieData.year}`;
			case "Rating":
				// Не обновляем пользовательскую оценку
				return null;
			case "Duration":
				return `Duration: ${movieData.duration} мин`;
			case "Description":
				return movieData.description
					? `Description: "${movieData.description
							.replace(/"/g, '\\"')
							.replace(/\n/g, "\\n")}"`
					: null;
			case "Author": {
				if (movieData.directors.length === 0) return null;
				const authorLines: string[] = ["Author:"];
				movieData.directors.forEach((director) => {
					authorLines.push(`  - ${director}`);
				});
				return authorLines.join("\n");
			}
			case "tags": {
				const allTags = [...movieData.genres, ...movieData.countries];
				if (allTags.length === 0) return null;
				const tagLines = ["tags:"];
				allTags.forEach((tag) => {
					tagLines.push(`  - ${tag}`);
				});
				return tagLines.join("\n");
			}
			case "Kinopoisk_ID":
				return `Kinopoisk_ID: ${movieData.kinopoiskId}`;
			case "Kinopoisk_Rating":
				return `Kinopoisk_Rating: ${movieData.ratingKinopoisk}`;
			case "Poster":
				// Не добавляем постер в frontmatter если отображаем как изображение
				if (settings?.displayPosterAsImage && settings?.includePoster) {
					return null;
				}
				return movieData.posterUrl
					? `Poster: ${movieData.posterUrl}`
					: null;
			default:
				return null;
		}
	}

	private static getNewFields(
		movieData: MovieData,
		processedFields: Set<string>,
		settings?: KinopoiskMovieFillerSettings
	): string[] {
		const newFields: string[] = [];

		if (!processedFields.has("Title")) {
			newFields.push(`Title: "${movieData.title.replace(/"/g, '\\"')}"`);
		}
		if (!processedFields.has("Year")) {
			newFields.push(`Year: ${movieData.year}`);
		}
		if (!processedFields.has("Duration")) {
			newFields.push(`Duration: ${movieData.duration} мин`);
		}
		if (!processedFields.has("Description") && movieData.description) {
			newFields.push(
				`Description: "${movieData.description
					.replace(/"/g, '\\"')
					.replace(/\n/g, "\\n")}"`
			);
		}
		if (!processedFields.has("Author") && movieData.directors.length > 0) {
			newFields.push("Author:");
			movieData.directors.forEach((director) => {
				newFields.push(`  - ${director}`);
			});
		}
		if (!processedFields.has("tags")) {
			const allTags = [...movieData.genres, ...movieData.countries];
			if (allTags.length > 0) {
				newFields.push("tags:");
				allTags.forEach((tag) => {
					newFields.push(`  - ${tag}`);
				});
			}
		}
		if (!processedFields.has("Kinopoisk_ID")) {
			newFields.push(`Kinopoisk_ID: ${movieData.kinopoiskId}`);
		}
		if (!processedFields.has("Kinopoisk_Rating")) {
			newFields.push(`Kinopoisk_Rating: ${movieData.ratingKinopoisk}`);
		}
		// Добавляем постер в frontmatter только если не отображаем как изображение
		if (
			!processedFields.has("Poster") &&
			movieData.posterUrl &&
			(!settings?.displayPosterAsImage || !settings?.includePoster)
		) {
			newFields.push(`Poster: ${movieData.posterUrl}`);
		}

		return newFields;
	}

	private static getPosterImage(
		movieData: MovieData,
		settings?: KinopoiskMovieFillerSettings
	): string {
		if (
			!movieData.posterUrl ||
			!settings?.includePoster ||
			!settings?.displayPosterAsImage
		) {
			return "";
		}

		return `![](${movieData.posterUrl})\n\n`;
	}
}
