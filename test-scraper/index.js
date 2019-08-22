const cheerio = require("cheerio")
const request = require("request-promise")

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.query.url) {
        //These are the options for the request
        let options = {
            uri: req.query.url,
            transform: body => {
                //After the request comes back we pass it through cheerio
                return cheerio.load(body)
            }
        }

        // This is where we make the request to fetch the page
        // The $ is a cheerio object that we will use to search for 
        // elements
        const $ = await request(options)
        const ads = $('.regular-ad')
        let newAds = [];
        ads.each((i, ad) => {
            newAds.push(
                {
                    title: $(ad).find("a.title").text(),
                    id: $(ad).attr("data-listing-id"),
                    price: $(ad).find(".price").text()
                }
            )
        })
        context.res = {
            //This is where the successful response goes
            body: JSON.stringify(newAds)
        };
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass in a URL you would like to scrape"
        };
    }
};