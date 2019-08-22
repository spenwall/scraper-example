const Cheerio = require("cheerio")
const Request = require("request-promise")
const Airtable = require("airtable")

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.query.url) {
        //These are the options for the request
        let options = {
            uri: req.query.url,
            transform: body => {
                //After the request comes back we pass it through cheerio
                return Cheerio.load(body)
            }
        }

        // This is where we make the request to fetch the page
        // The $ is a cheerio object that we will use to search for 
        // elements
        const $ = await Request(options)
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

        let lastId = LastId(url)

        context.res = {
            //This is where the successful response goes
            body: JSON.stringify(newAds)
        };
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass in a URL you would like to scrape"
        }
    }
}

const LastId = async(url) => {
    const apiKey = 'api' 
    let base = new Airtable({ apiKey }).base("{base-id}")

    const select = 'AND(url = "' + url + '")'

    let row = await base("{table-name}")
        .select({
            view: "Grid view",
            filteredByFormula: select
        }).firstPage()

    if (row.length) {
        return row[0].fields.lastId
    }

    createNewRow(url)
    return
}

const createNewRow = (url) => {
    const apiKey = 'api'
    let base = new Airtable({ apikey }).base("{base-id}")

    base("{table-name}").create(
        {
            url: url
        }
    )
}