const Cheerio = require("cheerio")
const Request = require("request-promise")
const Airtable = require("airtable")
const Mailgun = require("mailgun-js")

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    const url = req.query.url
    const email = req.query.email

    if (url && email) {
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
                    link: "https://kijiji.ca" + $(ad)
                    .find("a.title")
                    .attr("href"),
                    id: $(ad).attr("data-listing-id"),
                    price: $(ad).find(".price").text(),
                    image: $(ad).find("img").attr("src"),
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
            newAds.forEach((ad) => {
                sendNotifications(ad, email)
            })
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
    const apiKey = process.evn["AIRTABLE_API_KEY"]
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
    const apiKey = process.evn["AIRTABLE_API_KEY"] 
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

const sendNotifications = (ad, email) => {
    const apiKey = process.env['MAILGUN_API_KEY'];
    const domain = process.env['MAILGUN_DOMAIN'];

    const mail = Mailgun({apiKey, domain})
    const data = {
        from: 'Kijiji Alerts <alert@rfd.spencerwallace.ca>',
        to: email,
        subject: 'New Kijiji ad',
        template: 'kijiji-ad',
        "v:title": ad.title,
        "v:link": ad.link,
        "v:price": ad.price,
        "v:image": ad.image
    };

    mail.messages().send(data, function(err, body) {
        console.log(body)
    })

}