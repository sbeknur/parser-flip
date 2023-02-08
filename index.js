const { JSDOM } = require("jsdom");
const queue = require("async/queue");
const fs = require("fs");
const { count } = require("console");

const data = [];

/**
 * @param {number} page - номер страницы
 * @param {string} url - ссылка для парсинга
 * @param {boolean} isDetailed - истина, если парсим страницу с карточкой товара
 * @return {Promise<void>}
 */
async function parse(page, url, isDetailed) {
    try {
        const dom = await JSDOM.fromURL(url);
        const d = dom.window.document;

        if (!isDetailed) {
            console.log(`Обработка страницы ${url}`);
            const books = d.querySelectorAll(".placeholder");
            books.forEach((book) => {
                const link = book.querySelector(".pic.l-h-250");
                if (link) {
                    const detailedUrl =
                        "https://www.flip.kz" + link.getAttribute("href");
                    q.push({ page: page, url: detailedUrl, isDetailed: true });
                }
            });

            if (page < 10) {
                page++;
                const nextUrl = `https://www.flip.kz/catalog?subsection=1&filter-show=1&page=${page}`;
                q.push({ page: page, url: nextUrl, isDetailed: false });
            }
        } else {
            console.log(`Обработка карточки товара ${url}`);
            const bookName = d.querySelector(
                "span[itemprop='name']"
            ).textContent;

            let bookAuthor = "";
            const author = d.querySelector("a[href*='/descript?cat=people']");
            if (author) {
                bookAuthor = author.textContent;
            }

            const bookGenre = d.querySelector(
                "span[property='itemListElement']:nth-child(2)"
            ).textContent;

            let bookYear = "";
            d.querySelectorAll(".row").forEach((item) => {
                if (item.firstChild.textContent === "Дата выхода") {
                    bookYear = item.lastChild.textContent;
                }
            });

            const bookPublisher = d.querySelector(
                "a[href*='/descript?cat=publish'] > b"
            ).textContent;
            const bookPrice = d
                .querySelector("meta[itemprop='price']")
                .getAttribute("content");

            let bookRating = "";
            const rating = d.querySelector("strong[itemprop='ratingValue']");
            if (rating) {
                bookRating = rating.textContent;
            }

            let bookReviewNumber = "";
            const review = d.querySelector("span[itemprop='reviewCount']");
            if (review) {
                bookReviewNumber = review.textContent;
            }

            let bookPageNumber = "";
            d.querySelectorAll(".row").forEach((item) => {
                if (item.firstChild.textContent === "Количество страниц") {
                    bookPageNumber = item.lastChild.textContent;
                }
            });

            data.push({
                name: bookName,
                author: bookAuthor,
                genre: bookGenre,
                year: Number(bookYear),
                publisher: bookPublisher,
                price: Number(bookPrice),
                rating: Number(bookRating),
                reviewNumber: Number(bookReviewNumber),
                pageNumber: Number(bookPageNumber),
            });
        }
    } catch (e) {
        console.error(e);
    }
}

const q = queue(async (data, done) => {
    await parse(data.page, data.url, data.isDetailed);
    done();
});

q.push({
    page: 1,
    url: `https://www.flip.kz/catalog?subsection=1&filter-show=1&page=1`,
    isDetailed: false,
});

(async () => {
    await q.drain();
    if (data.length > 0) {
        fs.writeFileSync("./result.json", JSON.stringify(data));
        console.log(`Сохранено ${data.length} записей`);
    }
})();
