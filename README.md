# Example Azure Function Website Scraper

___

This is an example of a Azure function that scrapes the classified ad site kijiji.com. It uses Airtable to store the id of the last Ad that was scraped and then subsequent executions only look for new ads. Those new ads are then sent to a specified email address using the Mailgun service.

See a full blog post on it [here](https://spencerwallace.ca/blog/serverless-scraper)
