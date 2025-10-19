export interface MovieData {
	title: string;
	year: number;
	description: string;
	directors: string[];
	genres: string[];
	countries: string[];
	rating?: number;
	ratingKinopoisk: number;
	duration: number;
	posterUrl?: string;
	kinopoiskId: string;
}

export interface KinopoiskMovieFillerSettings {
	autoFillOnOpen: boolean;
	overwriteExisting: boolean;
	includePoster: boolean;
	apiKey?: string;
}
