const API_KEY = "c1de5628d87c81ec55b4d1ae9bd2b722";
const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/";

const elements = {
	refresh: document.querySelector("#refresh-button"), heroTrailer: document.querySelector("#hero-trailer"),
	status: document.querySelector("#status-message"), grid: document.querySelector("#series-grid"),
	search: document.querySelector("#search-input"), sort: document.querySelector("#sort-select"),
	count: document.querySelector("#collection-count"), heroImage: document.querySelector("#hero-image"),
	heroTitle: document.querySelector("#hero-title"), heroCopy: document.querySelector("#hero-copy"),
	heroFeature: document.querySelector("#hero-feature"), pagination: document.querySelector("#pagination"),
	previous: document.querySelector("#previous-page"), next: document.querySelector("#next-page"),
	pageIndicator: document.querySelector("#page-indicator"), dialog: document.querySelector("#trailer-dialog"),
	videoClose: document.querySelector("#video-close"), videoTitle: document.querySelector("#video-title"),
	videoMessage: document.querySelector("#video-message"), videoLink: document.querySelector("#video-link"),
	videoLinkLabel: document.querySelector("#video-link-label"), videoPreview: document.querySelector("#video-preview"),
	videoSearchLink: document.querySelector("#video-search-link"), returnToDashboard: document.querySelector("#return-to-dashboard")
};

const state = { items: [], page: 1, totalPages: 1, loading: false, featured: null };
elements.refresh.addEventListener("click", () => loadTopRated(state.page));
elements.search.addEventListener("input", renderCards);
elements.sort.addEventListener("change", renderCards);
elements.previous.addEventListener("click", () => loadTopRated(state.page - 1));
elements.next.addEventListener("click", () => loadTopRated(state.page + 1));
elements.heroTrailer.addEventListener("click", () => state.featured && playTrailer(state.featured));
elements.videoClose.addEventListener("click", () => elements.dialog.close());
elements.returnToDashboard.addEventListener("click", () => {
	elements.dialog.close();
	document.querySelector("#library").scrollIntoView({ behavior: "smooth" });
});
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.videoPreview.addEventListener("error", () => { elements.videoPreview.hidden = true; });

async function loadTopRated(page) {
	state.loading = true;
	state.page = page;
	showStatus("최고 평점 영화를 불러오는 중이에요.", "TMDB에서 영화 목록을 가져오고 있습니다.", "loading");
	elements.grid.replaceChildren();
	elements.pagination.hidden = true;
	const query = new URLSearchParams({ api_key: API_KEY, language: "ko-KR", page: String(page) });

	try {
		const response = await fetch(`${API_BASE}/movie/top_rated?${query}`);
		const payload = await response.json();
		if (!response.ok) throw new Error(payload.status_message || `TMDB 응답 오류 (${response.status})`);
		state.items = payload.results || [];
		state.page = payload.page || page;
		state.totalPages = payload.total_pages || 1;
		state.loading = false;
		elements.count.textContent = `MOVIES / ${Number(payload.total_results || 0).toLocaleString("ko-KR")}`;
		renderCards();
		updatePagination();
		updateHero(state.items[0]);
		if (state.items.length) elements.status.hidden = true;
		else showStatus("영화 목록이 비어 있어요.", "TMDB에서 최고 평점 영화 목록을 확인할 수 없습니다.", "empty");
	} catch (error) {
		state.loading = false;
		showStatus("영화 목록을 불러오지 못했어요.", explainError(error), "error");
		updatePagination();
	}
}

function explainError(error) {
	const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
	if (/Failed to fetch|NetworkError/i.test(message)) return "네트워크 연결을 확인해 주세요. 계속 실패하면 로컬 웹 서버로 열어 보세요.";
	if (/authentication|invalid.*key|unauthori[sz]ed|401|403/i.test(message)) return "TMDB API 키가 유효한지 확인해 주세요.";
	return message;
}

function showStatus(title, description, type) {
	elements.status.hidden = false;
	elements.status.querySelector(".status-mark").textContent = type === "loading" ? "···" : type === "error" ? "!" : type === "empty" ? "☆" : "↗";
	elements.status.querySelector("strong").textContent = title;
	elements.status.querySelector("p").textContent = description;
}

function renderCards() {
	const term = elements.search.value.trim().toLocaleLowerCase("ko");
	const key = elements.sort.value;
	const movies = state.items.filter((movie) => (movie.title || "").toLocaleLowerCase("ko").includes(term)).slice().sort((a, b) =>
		key === "release_date" ? (b.release_date || "").localeCompare(a.release_date || "") : Number(b[key] || 0) - Number(a[key] || 0));
	elements.grid.replaceChildren(...movies.map(createCard));
	if (state.items.length && !movies.length) showStatus("검색 결과가 없어요.", "다른 제목으로 검색해 보세요.", "empty");
	else if (movies.length) elements.status.hidden = true;
}

function createCard(movie, index) {
	const card = document.createElement("article");
	card.className = "series-card";
	card.style.animationDelay = `${Math.min(index * 35, 245)}ms`;
	const posterWrap = document.createElement("div");
	posterWrap.className = "poster-wrap";
	if (movie.poster_path) {
		const image = document.createElement("img");
		image.className = "poster";
		image.src = `${IMAGE_BASE}w500${movie.poster_path}`;
		image.alt = `${movie.title || "영화"} 포스터`;
		image.loading = "lazy";
		image.addEventListener("error", () => image.remove());
		posterWrap.append(image);
	} else {
		const placeholder = document.createElement("div");
		placeholder.className = "poster-placeholder";
		placeholder.textContent = movie.title || "포스터 없음";
		posterWrap.append(placeholder);
	}
	const rating = document.createElement("span");
	rating.className = "user-rating";
	rating.textContent = `★ ${formatNumber(movie.vote_average, 1)}`;
	posterWrap.append(rating);
	const trailer = document.createElement("button");
	trailer.className = "trailer-card-button";
	trailer.type = "button";
	trailer.setAttribute("aria-label", `${movie.title || "영화"} 예고편 보기`);
	trailer.innerHTML = '<span aria-hidden="true">▶</span> 예고편';
	trailer.addEventListener("click", () => playTrailer(movie));
	posterWrap.append(trailer);

	const info = document.createElement("div");
	info.className = "card-info";
	const titleLine = document.createElement("div");
	titleLine.className = "card-title-line";
	const title = document.createElement("h3");
	title.className = "card-title";
	title.textContent = movie.title || "제목 없음";
	title.title = movie.title || "제목 없음";
	titleLine.append(title);
	const meta = document.createElement("div");
	meta.className = "card-meta";
	meta.append(makeMeta("인기", formatNumber(movie.popularity, 1)), makeMeta("투표수", formatCompact(movie.vote_count)));
	info.append(titleLine, meta);
	card.append(posterWrap, info);
	return card;
}

function makeMeta(label, value) {
	const item = document.createElement("span");
	const key = document.createElement("b");
	key.textContent = `${label} `;
	item.append(key, document.createTextNode(value));
	return item;
}

function updateHero(movie) {
	if (!movie) return;
	state.featured = movie;
	const image = movie.backdrop_path || movie.poster_path;
	if (image) elements.heroImage.style.backgroundImage = `url("${IMAGE_BASE}original${image}")`;
	elements.heroTitle.textContent = movie.title || "최고 평점 영화";
	elements.heroCopy.textContent = movie.overview || "전 세계 관객이 높이 평가한 영화들을 한눈에 만나보세요.";
	elements.heroTrailer.hidden = false;
	elements.heroFeature.hidden = false;
	elements.heroFeature.textContent = `TMDB 평점 ★ ${formatNumber(movie.vote_average, 1)} · 개봉일 ${movie.release_date || "미정"} · 투표 ${formatCompact(movie.vote_count)}`;
	document.querySelector(".hero-eyebrow").innerHTML = '<span class="live-dot"></span> FEATURED TOP RATED FILM';
}

function updatePagination() {
	elements.pagination.hidden = state.totalPages <= 1;
	elements.previous.disabled = state.loading || state.page <= 1;
	elements.next.disabled = state.loading || state.page >= state.totalPages;
	elements.pageIndicator.textContent = `${String(state.page).padStart(2,"0")} / ${String(state.totalPages).padStart(2,"0")}`;
}

function formatNumber(value, digits = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "0";
}

function formatCompact(value) {
	const number = Number(value);
	return Number.isFinite(number) ? new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(number) : "0";
}

function playTrailer(movie) {
	const title = movie.title || "영화";
	const encodedTitle = encodeURIComponent(`${title} 예고편`);
	elements.videoTitle.textContent = `${title} · 예고편`;
	elements.videoLink.href = `https://www.youtube.com/results?search_query=${encodedTitle}`;
	elements.videoSearchLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
	elements.videoLinkLabel.textContent = "YouTube 검색 결과에서 예고편 선택";
	elements.videoMessage.hidden = true;
	elements.videoPreview.hidden = true;
	elements.videoPreview.removeAttribute("src");
	const image = movie.backdrop_path || movie.poster_path;
	if (image) {
		elements.videoPreview.src = `${IMAGE_BASE}w780${image}`;
		elements.videoPreview.hidden = false;
	}
	elements.videoLink.hidden = false;
	const setText = (id, text) => { document.querySelector(id).textContent = text; };
	setText("#video-info-title", title);
	setText("#video-info-date", movie.release_date || "개봉일 미정");
	setText("#video-overview", movie.overview || "등록된 줄거리가 없습니다.");
	setText("#video-rating", `★ ${formatNumber(movie.vote_average, 1)}`);
	setText("#video-popularity", formatNumber(movie.popularity, 1));
	setText("#video-votes", formatCompact(movie.vote_count));
	["#video-genres", "#video-runtime", "#video-cast"].forEach((id) => setText(id, "불러오는 중..."));
	elements.dialog.showModal();
	loadDetails(movie);
}

async function loadDetails(movie) {
	state.detailsFor = movie.id;
	const query = new URLSearchParams({ api_key: API_KEY, language: "ko-KR", append_to_response: "credits" });
	try {
		const response = await fetch(`${API_BASE}/movie/${movie.id}?${query}`);
		const detail = await response.json();
		if (!response.ok) throw new Error(detail.status_message);
		if (state.detailsFor !== movie.id) return;
		const genres = (detail.genres || []).map((genre) => genre.name).join(", ");
		const cast = ((detail.credits && detail.credits.cast) || []).slice(0, 6).map((person) => person.name).join(", ");
		const runtime = detail.runtime ? `${Math.floor(detail.runtime / 60)}시간 ${detail.runtime % 60}분 (${detail.runtime}분)` : "";
		document.querySelector("#video-genres").textContent = genres || "정보 없음";
		document.querySelector("#video-runtime").textContent = runtime || "정보 없음";
		document.querySelector("#video-cast").textContent = cast || "정보 없음";
		if (!movie.overview && detail.overview) document.querySelector("#video-overview").textContent = detail.overview;
	} catch (error) {
		if (state.detailsFor !== movie.id) return;
		["#video-genres", "#video-runtime", "#video-cast"].forEach((id) => { document.querySelector(id).textContent = "불러오지 못했어요."; });
	}
}

loadTopRated(1);
