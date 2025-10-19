import { MovieData } from './types';

export class FrontmatterUtils {
	static extractKinopoiskUrl(content: string): string | null {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return null;

		const frontmatter = frontmatterMatch[1];
		const kinopoiskMatch = frontmatter.match(/^Kinopoisk:\s*(.+)$/m);
		return kinopoiskMatch ? kinopoiskMatch[1].trim() : null;
	}

	static updateFrontmatter(content: string, movieData: MovieData, overwriteExisting: boolean = false): string {
		const frontmatterMatch = content.match(/^(---\n)([\s\S]*?)(\n---)/);
		if (!frontmatterMatch) {
			// Если нет frontmatter, создаем новый
			const newFrontmatter = this.createFrontmatter(movieData);
			return `${newFrontmatter}\n\n${content}`;
		}

		const [fullMatch, startDelimiter, frontmatter, endDelimiter] = frontmatterMatch;
		const restOfContent = content.substring(fullMatch.length);

		const updatedFrontmatter = this.updateExistingFrontmatter(frontmatter, movieData, overwriteExisting);
		return `${startDelimiter}${updatedFrontmatter}${endDelimiter}${restOfContent}`;
	}

	private static createFrontmatter(movieData: MovieData): string {
		const lines: string[] = [];

		// Основные поля
		lines.push(`Title: ${movieData.title}`);
		lines.push(`Year: ${movieData.year}`);
		lines.push(`Rating: ${movieData.rating}`);
		lines.push(`Duration: ${movieData.duration} мин`);
		
		if (movieData.description) {
			lines.push(`Description: ${movieData.description}`);
		}

		// Режиссеры
		if (movieData.directors.length > 0) {
			lines.push(`Author:`);
			movieData.directors.forEach(director => {
				lines.push(`  - ${director}`);
			});
		}

		// Теги (жанры + страны)
		const allTags = [...movieData.genres, ...movieData.countries];
		if (allTags.length > 0) {
			lines.push(`tags:`);
			allTags.forEach(tag => {
				lines.push(`  - ${tag}`);
			});
		}

		// Kinopoisk ID
		lines.push(`Kinopoisk_ID: ${movieData.kinopoiskId}`);

		// Постер
		if (movieData.posterUrl) {
			lines.push(`Poster: ${movieData.posterUrl}`);
		}

		return `---\n${lines.join('\n')}\n---`;
	}

	private static updateExistingFrontmatter(frontmatter: string, movieData: MovieData, overwriteExisting: boolean): string {
		const lines = frontmatter.split('\n');
		const updatedLines: string[] = [];
		const processedFields = new Set<string>();

		// Обрабатываем существующие строки
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmedLine = line.trim();

			// Пропускаем пустые строки
			if (!trimmedLine) {
				updatedLines.push(line);
				continue;
			}

			// Проверяем, нужно ли обновить это поле
			const fieldName = this.getFieldName(trimmedLine);
			if (fieldName && this.shouldUpdateField(fieldName, overwriteExisting)) {
				processedFields.add(fieldName);
				
				// Обновляем поле
				const newValue = this.getFieldValue(fieldName, movieData);
				if (newValue !== null) {
					updatedLines.push(newValue);
					
					// Если это многострочное поле (Author, tags), пропускаем следующие строки с отступами
					if (fieldName === 'Author' || fieldName === 'tags') {
						while (i + 1 < lines.length && lines[i + 1].startsWith('  ')) {
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

		// Добавляем новые поля, которые не были обработаны
		const newFields = this.getNewFields(movieData, processedFields);
		updatedLines.push(...newFields);

		return updatedLines.join('\n');
	}

	private static getFieldName(line: string): string | null {
		const match = line.match(/^([^:]+):/);
		return match ? match[1].trim() : null;
	}

	private static shouldUpdateField(fieldName: string, overwriteExisting: boolean): boolean {
		if (overwriteExisting) return true;
		
		// Поля, которые всегда обновляются
		const alwaysUpdate = ['Title', 'Year', 'Rating', 'Duration', 'Description', 'Author', 'tags', 'Kinopoisk_ID', 'Poster'];
		return alwaysUpdate.includes(fieldName);
	}

	private static getFieldValue(fieldName: string, movieData: MovieData): string | null {
		switch (fieldName) {
			case 'Title':
				return `Title: ${movieData.title}`;
			case 'Year':
				return `Year: ${movieData.year}`;
			case 'Rating':
				return `Rating: ${movieData.rating}`;
			case 'Duration':
				return `Duration: ${movieData.duration} мин`;
			case 'Description':
				return movieData.description ? `Description: ${movieData.description}` : null;
			case 'Author':
				if (movieData.directors.length === 0) return null;
				const authorLines = ['Author:'];
				movieData.directors.forEach(director => {
					authorLines.push(`  - ${director}`);
				});
				return authorLines.join('\n');
			case 'tags':
				const allTags = [...movieData.genres, ...movieData.countries];
				if (allTags.length === 0) return null;
				const tagLines = ['tags:'];
				allTags.forEach(tag => {
					tagLines.push(`  - ${tag}`);
				});
				return tagLines.join('\n');
			case 'Kinopoisk_ID':
				return `Kinopoisk_ID: ${movieData.kinopoiskId}`;
			case 'Poster':
				return movieData.posterUrl ? `Poster: ${movieData.posterUrl}` : null;
			default:
				return null;
		}
	}

	private static getNewFields(movieData: MovieData, processedFields: Set<string>): string[] {
		const newFields: string[] = [];
		
		if (!processedFields.has('Title')) {
			newFields.push(`Title: ${movieData.title}`);
		}
		if (!processedFields.has('Year')) {
			newFields.push(`Year: ${movieData.year}`);
		}
		if (!processedFields.has('Rating')) {
			newFields.push(`Rating: ${movieData.rating}`);
		}
		if (!processedFields.has('Duration')) {
			newFields.push(`Duration: ${movieData.duration} мин`);
		}
		if (!processedFields.has('Description') && movieData.description) {
			newFields.push(`Description: ${movieData.description}`);
		}
		if (!processedFields.has('Author') && movieData.directors.length > 0) {
			newFields.push('Author:');
			movieData.directors.forEach(director => {
				newFields.push(`  - ${director}`);
			});
		}
		if (!processedFields.has('tags')) {
			const allTags = [...movieData.genres, ...movieData.countries];
			if (allTags.length > 0) {
				newFields.push('tags:');
				allTags.forEach(tag => {
					newFields.push(`  - ${tag}`);
				});
			}
		}
		if (!processedFields.has('Kinopoisk_ID')) {
			newFields.push(`Kinopoisk_ID: ${movieData.kinopoiskId}`);
		}
		if (!processedFields.has('Poster') && movieData.posterUrl) {
			newFields.push(`Poster: ${movieData.posterUrl}`);
		}

		return newFields;
	}
}
