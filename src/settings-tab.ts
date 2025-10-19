import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { KinopoiskMovieFillerSettings, DEFAULT_SETTINGS } from './settings';

export class KinopoiskMovieFillerSettingTab extends PluginSettingTab {
	plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Настройки Kinopoisk Movie Filler' });

		new Setting(containerEl)
			.setName('Автозаполнение при открытии файла')
			.setDesc('Автоматически заполнять информацию о фильме при открытии файла с ссылкой на Kinopoisk')
			.addToggle(toggle => toggle
				.setValue((this.plugin as any).settings.autoFillOnOpen)
				.onChange(async (value) => {
					(this.plugin as any).settings.autoFillOnOpen = value;
					await (this.plugin as any).saveSettings();
				}));

		new Setting(containerEl)
			.setName('Перезаписывать существующие поля')
			.setDesc('Перезаписывать поля, которые уже заполнены в frontmatter')
			.addToggle(toggle => toggle
				.setValue((this.plugin as any).settings.overwriteExisting)
				.onChange(async (value) => {
					(this.plugin as any).settings.overwriteExisting = value;
					await (this.plugin as any).saveSettings();
				}));

		new Setting(containerEl)
			.setName('Включать URL постера')
			.setDesc('Добавлять URL постера фильма в frontmatter')
			.addToggle(toggle => toggle
				.setValue((this.plugin as any).settings.includePoster)
				.onChange(async (value) => {
					(this.plugin as any).settings.includePoster = value;
					await (this.plugin as any).saveSettings();
				}));

		new Setting(containerEl)
			.setName('API ключ Kinopoisk')
			.setDesc('API ключ для доступа к Kinopoisk API (по умолчанию уже настроен)')
			.addText(text => text
				.setPlaceholder('Введите ваш API ключ')
				.setValue((this.plugin as any).settings.apiKey || '')
				.onChange(async (value) => {
					(this.plugin as any).settings.apiKey = value;
					await (this.plugin as any).saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Информация' });
		
		const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
		infoEl.innerHTML = `
			<p><strong>Как использовать:</strong></p>
			<ol>
				<li>Добавьте поле <code>Kinopoisk: https://www.kinopoisk.ru/film/ID/</code> в frontmatter вашего файла</li>
				<li>Используйте команду "Заполнить информацию о фильме из Kinopoisk" из палитры команд</li>
				<li>Плагин автоматически заполнит поля: Title, Year, Rating, Duration, Description, Author, tags, Kinopoisk_ID</li>
			</ol>
			<p><strong>Поддерживаемые поля:</strong></p>
			<ul>
				<li><code>Title</code> - название фильма</li>
				<li><code>Year</code> - год выпуска</li>
				<li><code>Rating</code> - рейтинг на Kinopoisk</li>
				<li><code>Duration</code> - продолжительность в минутах</li>
				<li><code>Description</code> - описание фильма</li>
				<li><code>Author</code> - режиссеры (список)</li>
				<li><code>tags</code> - жанры и страны (список)</li>
				<li><code>Kinopoisk_ID</code> - ID фильма на Kinopoisk</li>
				<li><code>Poster</code> - URL постера (если включено)</li>
			</ul>
		`;
	}
}
