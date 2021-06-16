/**
 * [Adwords Scripts] Pause out of stock products and 404ed pages. Unpause back in stock products
 *
 *
 * Update of https://searchengineland.com/pause-out-of-stock-products-with-this-google-ads-script-325561
 *
 * Note1:
 *
 * 1) this script does not work for Dynamic Search ads. For that you need to Create exclusions for Dynamic Search Ads
 * as documented here https://support.google.com/google-ads/answer/7185083?hl=en
 * here's a video: https://www.loom.com/share/386e1a13f8bc4abb804ac26c754369a2
 *
 * 2) if you use the same google ads account for your custom (shopify) store and amazon store be sure to exclude amazon ads
 * from this script since they have different out of stock indicators than your custom store.
 *
 * 3) you may get an "address unavalaible error" when running this. It's because your store times out for trying to return the
 * given url for the ad. Just run the script again (and improve the performance of your website).
 *
 * Version: 1.1
 * maintained by SlideRuleTech
 *
 **/
////
////

//Specify what phrase/word campaign names should contain, use '' to ignore
CAMPAIGN_CONTAINS = "";

//Specify what phrase/word campaign names should not contain, use '' to ignore
CAMPAIGN_DOES_NOT_CONTAIN = "";

//Specify the html element that indentifiefs out of stock items
OUT_OF_STOCK_TEXT = '<span class="sold_out">Sold Out</span>';

//Specify the URL's element that indentifiefs product pages
DETAIL_PAGE_STRING = "/products/";

function createLabel(name) {
  var labels = AdWordsApp.labels().withCondition("LabelName = " + name);

  if (labels.get().totalNumEntities() == 0) {
    AdWordsApp.createLabel(name.replace('"', "").replace('"', ""));
    return 0;
  } else {
    return labels.get().next().getId();
  }
}

function parse(item) {
  return '"' + item + '"';
}

function getActiveAds() {
  if (CAMPAIGN_CONTAINS && !CAMPAIGN_DOES_NOT_CONTAIN) {
    var query =
      "Status = ENABLED AND CampaignName CONTAINS " + parse(CAMPAIGN_CONTAINS);
  } else if (!CAMPAIGN_CONTAINS && CAMPAIGN_DOES_NOT_CONTAIN) {
    var query =
      "Status = ENABLED AND CampaignName DOES_NOT_CONTAIN " +
      parse(CAMPAIGN_DOES_NOT_CONTAIN);
  } else if (CAMPAIGN_CONTAINS && CAMPAIGN_DOES_NOT_CONTAIN) {
    var query =
      "Status = ENABLED AND CampaignName CONTAINS " +
      parse(CAMPAIGN_CONTAINS) +
      " AND CampaignName DOES_NOT_CONTAIN " +
      parse(CAMPAIGN_DOES_NOT_CONTAIN);
  } else if (!CAMPAIGN_CONTAINS && !CAMPAIGN_DOES_NOT_CONTAIN) {
    var query = "Status = ENABLED";
  }

  return AdWordsApp.ads().withCondition(query).get();
}

function getPausedAds(labelName) {
  return AdWordsApp.ads()
    .withCondition("LabelNames CONTAINS_ANY " + "[" + labelName + "]")
    .get();
}

function pauseAds(ads, labelName) {
  Logger.log(
    "Checking enabled ads... Number of ads to check: " + ads.totalNumEntities()
  );

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();
    if (url) {
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() == 404) {
        isOutOfStock = 1;
      } else if (response.getResponseCode() == 200) {
        var content = response.getContentText();
        var isOutOfStock = content.search(OUT_OF_STOCK_TEXT);
      }
      if (isOutOfStock > -1) {
        if (response.getResponseCode() == 404) {
          Logger.log(url + " " + "404");
        } else {
          Logger.log(url + " " + "OUT OF STOCK");
        }
        ad.pause();
        ad.applyLabel(labelName.replace('"', "").replace('"', ""));
      }
    }
  }
}

function resumeAds(ads, labelName) {
  Logger.log(
    "Checking paused ads... Number of ads to check: " + ads.totalNumEntities()
  );

  while (ads.hasNext()) {
    var ad = ads.next();
    var url = ad.urls().getFinalUrl();
    if (url) {
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() == 404) {
        isOutOfStock = 1;
      } else if (response.getResponseCode() == 200) {
        var content = response.getContentText();
        var isOutOfStock = content.search(OUT_OF_STOCK_TEXT);
      }
      if (isOutOfStock == -1) {
        Logger.log(url + " " + "BACK IN STOCK");
        ad.enable();
        var labels = ad
          .labels()
          .withCondition("LabelName = " + labelName)
          .get()
          .next()
          .remove();
      }
    }
  }
}

function main() {
  var labelName = '"Paused - Out of Stock"';
  var labelId = createLabel(labelName);
  var ads = getActiveAds();

  pauseAds(ads, labelName);

  if (labelId != 0) {
    var pausedAds = getPausedAds(labelName);
    resumeAds(pausedAds, labelName);
  }
}
