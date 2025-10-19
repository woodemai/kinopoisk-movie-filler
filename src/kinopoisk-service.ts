import { MovieData } from "./types";
import { request } from "obsidian";

const KINOPOISK_API_BASE_URL = "https://kinopoiskapiunofficial.tech/api/v2.2";
const KINOPOISK_API_BASE_URL_V1 = "https://kinopoiskapiunofficial.tech/api/v1";

interface KinopoiskApiResponse {
	kinopoiskId: number;
	imdbId: string;
	nameRu: string;
	nameEn: string;
	nameOriginal: string;
	posterUrl: string;
	posterUrlPreview: string;
	coverUrl: string;
	logoUrl: string;
	reviewsCount: number;
	ratingGoodReview: number;
	ratingGoodReviewVoteCount: number;
	ratingKinopoisk: number;
	ratingKinopoiskVoteCount: number;
	ratingImdb: number;
	ratingImdbVoteCount: number;
	ratingFilmCritics: number;
	ratingFilmCriticsVoteCount: number;
	ratingAwait: number;
	ratingAwaitCount: number;
	ratingRfCritics: number;
	ratingRfCriticsVoteCount: number;
	webUrl: string;
	year: number;
	filmLength: number;
	slogan: string;
	description: string;
	shortDescription: string;
	editorAnnotation: string;
	isTicketsAvailable: boolean;
	productionStatus: string;
	type: string;
	ratingMpaa: string;
	ratingAgeLimits: string;
	hasImax: boolean;
	has3D: boolean;
	lastSync: string;
	countries: Array<{ country: string }>;
	genres: Array<{ genre: string }>;
	startYear: number;
	endYear: number;
	serial: boolean;
	shortFilm: boolean;
	completed: boolean;
}

export class KinopoiskService {
	private apiKey: string;

	constructor(apiKey = "bcd6d1a5-6bbd-42fa-a761-f5d616165e85") {
		this.apiKey = apiKey;
	}

	async fetchMovieData(kinopoiskUrl: string): Promise<MovieData | null> {
		try {
			const movieId = this.extractMovieId(kinopoiskUrl);
			if (!movieId) {
				throw new Error("Не удалось извлечь ID фильма/сериала из URL");
			}

			const response = await request({
				url: `${KINOPOISK_API_BASE_URL}/films/${movieId}`,
				method: "GET",
				headers: {
					"X-API-KEY": this.apiKey,
					"Content-Type": "application/json",
				},
			});

			const data: KinopoiskApiResponse = JSON.parse(response);
			return this.parseApiResponse(data);
		} catch (error) {
			console.error("Ошибка при получении данных фильма/сериала:", error);
			return null;
		}
	}

	private extractMovieId(url: string): string | null {
		const filmMatch = url.match(/\/film\/(\d+)/);
		const seriesMatch = url.match(/\/series\/(\d+)/);
		return filmMatch ? filmMatch[1] : seriesMatch ? seriesMatch[1] : null;
	}

	private parseApiResponse(data: KinopoiskApiResponse): MovieData {
		// Для сериалов используем startYear, для фильмов - year
		const year =
			data.serial && data.startYear ? data.startYear : data.year || 0;

		// Для сериалов duration может быть 0, но это нормально
		const duration = data.serial ? 0 : data.filmLength || 0;

		return {
			title:
				data.nameRu || data.nameEn || data.nameOriginal || "Неизвестно",
			year: year,
			description: data.description || data.shortDescription || "",
			directors: [], // Режиссеры нужно получать отдельным запросом
			genres: data.genres?.map((g) => g.genre) || [],
			countries: data.countries?.map((c) => c.country) || [],
			ratingKinopoisk: data.ratingKinopoisk || 0,
			duration: duration,
			posterUrl: data.posterUrl || undefined,
			kinopoiskId: data.kinopoiskId.toString(),
		};
	}

	async fetchDirectors(movieId: string): Promise<string[]> {
		try {
			const response = await request({
				url: `${KINOPOISK_API_BASE_URL_V1}/staff?filmId=${movieId}`,
				method: "GET",
				headers: {
					"X-API-KEY": this.apiKey,
					"Content-Type": "application/json",
				},
			});

			const data = JSON.parse(response);
			const directors = data
				.filter(
					(person: { professionKey: string }) =>
						person.professionKey === "DIRECTOR"
				)
				.map(
					(person: { nameRu?: string; nameEn?: string }) =>
						person.nameRu || person.nameEn
				);

			return directors;
		} catch (error) {
			console.error("Ошибка при получении режиссеров:", error);
			return [];
		}
	}

	async fetchFullMovieData(kinopoiskUrl: string): Promise<MovieData | null> {
		try {
			const movieId = this.extractMovieId(kinopoiskUrl);
			if (!movieId) {
				throw new Error("Не удалось извлечь ID фильма/сериала из URL");
			}

			// Получаем основную информацию о фильме
			const movieData = await this.fetchMovieData(kinopoiskUrl);
			if (!movieData) {
				return null;
			}

			// Получаем информацию о режиссерах
			const directors = await this.fetchDirectors(movieId);
			movieData.directors = directors;

			return movieData;
		} catch (error) {
			console.error(
				"Ошибка при получении полных данных фильма/сериала:",
				error
			);
			return null;
		}
	}
}
