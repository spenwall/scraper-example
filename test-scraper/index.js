const Cheerio = require("cheerio")
const Request = require("request-promise")
const Airtable = require("airtable")

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    const url = req.query.url

    if (url) {
        //These are the options for the request
        let options = {
            uri: url,
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
        let allAds = ads.map((i, ad) => {
            return  {
                    title: $(ad).find("a.title").text(),
                    id: $(ad).attr("data-listing-id"),
                    price: $(ad).find(".price").text()
                    }
                })
        

        let lastId = await LastId(url)
    
        let newAds = []
        // The each function is from the cheerio object
        // return false breaks the loop
        allAds.each((i, ad) => {
            if (ad.id === lastId) {
                return false
            }
            newAds.push(ad)
        })

        if (newAds.length) {
            let newestAdId = newAds[0].id
            saveNewestAdId(url, newestAdId)
        }

        context.res = {
            //This is where the successful response goes
            body: JSON.stringify(newAds)
        }
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass in a URL you would like to scrape"
        }
    }
}

const LastId = async (url) => {
    const apiKey = 'key4VeTEjoa318V75'
    const base = new Airtable({ apiKey }).base("app6oORsYg8BZk2GE")

    const select = `({url} = "${url}")`;

    let row = await base("test-scraper")
        .select({
            view: "Grid view",
            filterByFormula: select,
        })
        .firstPage()

    if (row.length) {
        return row[0].fields.lastId
    }

    createNewRow(url)
    return
}

const createNewRow = (url) => {
    const apiKey = 'key4VeTEjoa318V75'
    const base = new Airtable({ apiKey }).base("app6oORsYg8BZk2GE")

    base("test-scraper").create(
        {
            "url": url
        }
    )
}

const saveNewestAdId = (url, id) => {
    const apiKey = 'key4VeTEjoa318V75'
    const base = new Airtable({ apiKey }).base("app6oORsYg8BZk2GE")

    const select = `({url} = "${url}")`;

    base("test-scraper")
        .select({
            view: "Grid view",
            filterByFormula: select,
        })
        .firstPage((err, records) => {
            if (err) {
                console.error(err)
                return
            }
            if (records.length === 1) {
                base("test-scraper").update(records[0].id,
                    {
                        lastId: id
                    }, (err, record) => {
                        if (err) {
                            console.error(err)
                            return
                        }
                    })
            }
        })
    
}