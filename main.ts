import { MarkdownView, Notice, Plugin } from "obsidian";
import { KinopoiskMovieFillerSettings, DEFAULT_SETTINGS } from "./src/settings";
import { registerCommands } from "./src/commands";
import { KinopoiskMovieFillerSettingTab } from "./src/settings-tab";
import { FrontmatterUtils } from "./src/frontmatter-utils";
import { KinopoiskService } from "./src/kinopoisk-service";

export default class KinopoiskMovieFillerPlugin extends Plugin {
	settings: KinopoiskMovieFillerSettings;

	async onload() {
		await this.loadSettings();

		// Добавляем иконку в левую панель
		const ribbonIconEl = this.addRibbonIcon(
			"film",
			"Kinopoisk Movie Filler",
			(_evt: MouseEvent) => {
				new Notice("Kinopoisk Movie Filler готов к работе!");
			}
		);
		ribbonIconEl.addClass("kinopoisk-movie-filler-ribbon-class");

		// Регистрируем команды
		registerCommands(this, this.settings);

		// Добавляем вкладку настроек
		this.addSettingTab(new KinopoiskMovieFillerSettingTab(this.app, this));

		// Автозаполнение при открытии файла
		if (this.settings.autoFillOnOpen) {
			this.registerEvent(
				this.app.workspace.on("file-open", async (file) => {
					if (file && file.extension === "md") {
						const view =
							this.app.workspace.getActiveViewOfType(
								MarkdownView
							);
						if (view && view.file === file) {
							await this.autoFillMovieInfo(view);
						}
					}
				})
			);
		}

		console.log("Kinopoisk Movie Filler plugin loaded");
	}

	onunload() {
		console.log("Kinopoisk Movie Filler plugin unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async autoFillMovieInfo(view: MarkdownView) {
		try {
			const content = view.data;
			const kinopoiskUrl = FrontmatterUtils.extractKinopoiskUrl(content);

			if (!kinopoiskUrl) {
				return; // Нет ссылки на Kinopoisk, ничего не делаем
			}

			// Проверяем, есть ли уже заполненная информация
			const hasExistingInfo = this.hasExistingMovieInfo(content);
			if (hasExistingInfo && !this.settings.overwriteExisting) {
				return; // Информация уже есть и не нужно перезаписывать
			}

			new Notice("🔍 Автоматическое заполнение информации о фильме...");

			const kinopoiskService = new KinopoiskService(this.settings.apiKey);
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
				this.settings.overwriteExisting
			);

			// Обновляем содержимое файла
			if (view.file) {
				await this.app.vault.modify(view.file, updatedContent);
			}

			new Notice(
				`✅ Информация о фильме "${movieData.title}" автоматически заполнена`
			);
		} catch (error) {
			console.error(
				"Ошибка при автозаполнении информации о фильме:",
				error
			);
		}
	}

	private hasExistingMovieInfo(content: string): boolean {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return false;

		const frontmatter = frontmatterMatch[1];
		const requiredFields = [
			"Title",
			"Year",
			"Rating",
			"Description",
			"Author",
		];

		return requiredFields.some((field) => {
			const regex = new RegExp(`^${field}:\\s*`, "m");
			return regex.test(frontmatter);
		});
	}
}
