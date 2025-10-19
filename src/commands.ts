import { App, Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { KinopoiskService } from "./kinopoisk-service";
import { FrontmatterUtils } from "./frontmatter-utils";
import { KinopoiskMovieFillerSettings } from "./types";

export function registerCommands(
	plugin: Plugin,
	settings: KinopoiskMovieFillerSettings
) {
	plugin.addCommand({
		id: "fill-movie-info",
		name: "Заполнить информацию о фильме из Kinopoisk",
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			await fillMovieInfo(plugin.app, editor, view, settings);
		},
	});

	plugin.addCommand({
		id: "fill-movie-info-if-url",
		name: "Заполнить информацию о фильме (если есть ссылка Kinopoisk)",
		checkCallback: (checking: boolean) => {
			const markdownView =
				plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (markdownView) {
				const content = markdownView.data;
				const kinopoiskUrl =
					FrontmatterUtils.extractKinopoiskUrl(content);

				if (kinopoiskUrl) {
					if (!checking) {
						fillMovieInfo(
							plugin.app,
							markdownView.editor,
							markdownView,
							settings
						);
					}
					return true;
				}
			}
			return false;
		},
	});

	plugin.addCommand({
		id: "update-movie-info",
		name: "Обновить информацию о фильме (перезаписать существующие поля)",
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			await fillMovieInfo(plugin.app, editor, view, {
				...settings,
				overwriteExisting: true,
			});
		},
	});
}

async function fillMovieInfo(
	app: App,
	editor: Editor,
	view: MarkdownView,
	settings: KinopoiskMovieFillerSettings
) {
	try {
		const content = view.data;
		const kinopoiskUrl = FrontmatterUtils.extractKinopoiskUrl(content);

		if (!kinopoiskUrl) {
			new Notice("❌ Не найдена ссылка на Kinopoisk в frontmatter");
			return;
		}

		new Notice("🔍 Получение информации о фильме...");

		const kinopoiskService = new KinopoiskService(settings.apiKey);
		const movieData = await kinopoiskService.fetchFullMovieData(
			kinopoiskUrl
		);

		if (!movieData) {
			new Notice("❌ Не удалось получить информацию о фильме");
			return;
		}

		const updatedContent = FrontmatterUtils.updateFrontmatter(
			content,
			movieData,
			settings.overwriteExisting
		);

		// Обновляем содержимое файла
		if (view.file) {
			await app.vault.modify(view.file, updatedContent);
		}

		new Notice(
			`✅ Информация о фильме "${movieData.title}" успешно заполнена`
		);
	} catch (error) {
		console.error("Ошибка при заполнении информации о фильме:", error);
		new Notice("❌ Произошла ошибка при заполнении информации о фильме");
	}
}
