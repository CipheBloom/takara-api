const express = require("express");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

// Configure Chrome options
const getChromeOptions = () => {
  const options = new chrome.Options();
  options.addArguments("--headless");
  options.addArguments("--disable-gpu");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  return options;
};

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  let driver;
  try {
    // Initialize WebDriver
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(getChromeOptions())
      .build();

    console.log(`Navigating to URL: ${url}`);
    await driver.get(url);

    // Wait for content to load
    await driver.wait(async () => {
      const content = await driver.findElement(By.id("content-download"));
      const html = await content.getAttribute("innerHTML");
      return html.trim() !== "";
    }, 120000);

    // Get content
    const contentDownload = await driver.findElement(By.id("content-download"));
    const outerHTML = await contentDownload.getAttribute("outerHTML");

    // Parse HTML with cheerio
    const $ = cheerio.load(outerHTML);
    const downloadLinks = [];

    // Get direct download links
    $(".mirror_link:first-child .dowload a").each((_, element) => {
      downloadLinks.push({
        text: $(element).text().replace("Download", "").trim(),
        href: $(element).attr("href"),
      });
    });

    // Get mirror links
    $(".mirror_link:last-child .dowload a").each((_, element) => {
      const text = $(element).text().trim();
      if (!text.includes("For Ad")) {
        downloadLinks.push({
          text: text.replace("Download", "").trim(),
          href: $(element).attr("href"),
        });
      }
    });

    return res.json({
      success: true,
      links: downloadLinks,
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
