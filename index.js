const got = require("got");
const htmlparser = require("node-html-parser");
const nodemailer = require("nodemailer");
require("dotenv").config();

const productLink = 'https://www.mindfactory.de/Highlights/MindStar';
let productNames = [];
let productPrices = [];
var needsUpdate = false;

async function monitor()
{
    //Makes a request for the URL
    var myheaders = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6",
        "cache-control": "max-age=0",
        "referer": "https://www.mindfactory.de/search_result.php?search_query=rtx+3080",
        "sec-ch-ua": '"Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92"',
        "cookie": "cookies_accepted=true; NSid=b02ca8f2d9f2e9c7c8069052a7514bef",
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": 1,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"
    }

    //Sends that request over and saves the received information in the variable "response"
    const response = await got(productLink, {
        headers: myheaders  
    });
    console.log(response.statusCode);
    //If the statuscode is 200 => HTTP Request went through and arrived successfully
    if(response && response.statusCode == 200)
    {
        //Gets the HTML code and selects only the spans of the current products that are available to get the prices and names
        let root = htmlparser.parse(response.body);
        let dataMindstarName = root.querySelectorAll('span[data-mindstar-name]');
        let dataMindstarPrice = root.querySelectorAll('span[data-mindstar-price]');

        //Checks if the array is empty or the array needs to get updated and pushes all the data from the request into the 2 arrays
        if(productNames.length == 0 && productPrices.length == 0 || needsUpdate == true)
        {
            for(k = 1; k<dataMindstarName.length;k = k+2)
            {
                productNames.push(dataMindstarName[k].innerText.toLowerCase());
                productPrices.push(dataMindstarName[k].innerText.toLowerCase());
                console.log(`${dataMindstarName[k].innerText.toLowerCase()} just got added to the Collection for the price of: ${dataMindstarPrice[k].innerText.toLowerCase()}!`);
            }
            needsUpdate = false;
        }
        else
        {
            for(let i = 1;i<dataMindstarPrice.length;i = i+2)
            {
                if(dataMindstarName[i].innerText.toLowerCase()!=productNames[(i-1)/2] && dataMindstarPrice[i].innerText.toLowerCase()!=productPrices[(i-1)/2])
                {
                    //Checks if a product might have just been removed. Loops through the whole array and checks if the "unknown" product is already existing
                    var help = 0;
                    for(y = 1;y<dataMindstarName.length;y = y+2)
                    {
                        if(dataMindstarName[i].innerText.toLowerCase()!=productNames[(y-1)/2])
                        {
                            help++;
                            if(help = productNames.length)
                            {
                                console.log(`The Product: ${dataMindstarName[i].innerText.toLowerCase()} has been added with the price of ${dataMindstarPrice[i].innerText.toLowerCase()}`);
                                needsUpdate = true;
                                //Sends a email with nodemailer
                                const transporting = nodemailer.createTransport({
                                    //Change service to whatever service you use (Problems with Gmail can accur with Nodemailer)
                                    service: "outlook.com",
                                    auth: {
                                        user: `${process.env.EMAIL}`,
                                        pass: `${process.env.PASSWORD}`
                                    },
                                    tls:{
                                        rejectUnauthorized: false
                                    }
                                });
                            
                                const options = {
                                    from: `${process.env.EMAIL}`,
                                    to: "schennis.dielke@gmail.com",
                                    subject: "Ein neues Produkt wurde hinzugefügt!",
                                    text: `Das Produkt: ${dataMindstarName[i].innerText.toLowerCase()} ist nun für den Preis von ${dataMindstarPrice[i].innerText.toLowerCase()} verfügbar!`
                                };
                            
                                transporting.sendMail(options, function (err, info){
                                    if(err)
                                    {
                                        console.log(err);
                                        return;
                                    }
                                    console.log("Sent: "+info.response);
                                });
                            }
                            else
                            {
                                console.log("Nothing new. A product just got removed!");
                                needsUpdate = true;
                            }
                        }
                    }
                }
            }
        }
    }
    else
    {
        console.log("Something went wrong!");
    }
    //Runs the program again every 10 seconds
    await new Promise(r => setTimeout(r, 10000));
    monitor();
}
monitor();