/* eslint-disable no-undef */
module.exports = class customCache {
  /*
    Author: Rockers Technologies, USA
    Usage: Get cache data saved server side by given name.
    Function Name: getCacheData()
    Paramaters: cacheName
    Return: Object
  */
  getCacheData(cacheName) {
    if (appCache.has(cacheName)) {
      return appCache.get(cacheName);
    }
    return false;
  }

  /*
    Author: Rockers Technologies, USA
    Usage: Delete cache data saved server side by given name.
    Function Name: deleteCacheData()
    Paramaters: cacheName
    Return: Boolean
  */
  deleteCacheData(cacheName) {
    return appCache.del(cacheName);
  }

  /*
    Author: Rockers Technologies, USA
    Usage: Delete Campaign cache data saved server side by given name.
    Function Name: deleteCampaignCache()
    Paramaters: companySlug
    Return: Boolean
  */
  deleteCampaignCache(companySlug) {
    return appCache.del(`CampaignDetail${companySlug}`);
  }

  /*
    Author: Rockers Technologies, USA
    Usage: Delete all cache data saved server side by given name.
    Function Name: clearAllCache()
    Paramaters: @noParams
    Return: @noReturn
  */
  clearAllCache() {
    appCache.flushAll();
  }
};
