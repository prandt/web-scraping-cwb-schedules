const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const url = "https://www.urbs.curitiba.pr.gov.br/"
const horarioDeOnibus = "https://www.urbs.curitiba.pr.gov.br/horario-de-onibus/"

async function getContent() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url);

    // Get select
    const select = await page.waitForSelector("#compHritLinha")
    const options = await select?.evaluate((el) => [...el.options].map((option) => ({
        value: option.value,
        text: option.textContent,
    })))
    saveInFile(options)
    await browser.close();
}

function saveInFile(content, fileName = "options") {
    const filePath = path.resolve(__dirname, `linhas/${fileName}.json`)
    fs.writeFile(filePath, JSON.stringify(content, null, 2), (err) => {
        if (err) {
            throw new Error("Something went wrong")
        }
    })
}

async function getSchedules(page, lineCode) {
    await page.goto(horarioDeOnibus + lineCode);

    const divDecorada = await page.waitForSelector("#decorada")
    const elementHtml = await divDecorada?.evaluate((el) => [...el.children].map((child) => {
        return {
            text: child.textContent,
            html: child.innerHTML,
            class: child.className,
        }
    }))
    
    const data = []
    for (let i = 4; i < elementHtml.length; i++) {
        await page.setContent(elementHtml[i].html)
        const busStop = await page.waitForSelector("body > div > h3")
        const busStopText = await busStop?.evaluate((el) => el.textContent)
    
        const dayWeek = await page.waitForSelector("body > div > p > b")
        const dayWeekText = await dayWeek?.evaluate((el) => el.textContent)
    
        const schedules = await page.waitForSelector("body > div > ul")
        const schedulesText = await schedules?.evaluate((el) => [...el.children].map((child) => child.textContent))

        data.push({
            busStop: busStopText,
            dayWeek: dayWeekText,
            schedules: schedulesText,
        })
    }
    saveInFile(data, lineCode)
}

function getOptions() {
    const options = require("./linhas/options.json")
    return options
}


(async () => {
    await getContent()
    const lines = getOptions()
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    for (const line of lines) {
        try {
            await getSchedules(page, line.value)
        } catch {
            console.log(`Error on line ${line.value}`)
        }
    }
})()

