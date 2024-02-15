/* eslint-disable no-undef */
const GeneralSettingModel = require("../../adminModules/generalSettings/models/generalSettingModel");
const CustomCache = require("../common/customCache");

module.exports = class generalSettings {
  /*
  Author: Rockers Technologies, USA
    Usage: Get General Settings.
    Function Name: getGeneralSettings()
    Paramaters: @noParams
    Return: Object
  */
  async getGeneralSettings() {
    let siteSetting = new CustomCache().getCacheData("GeneralSetting");
    if (!siteSetting) {
      siteSetting = await GeneralSettingModel.findOne().sort({ _id: -1 });
      appCache.set("GeneralSetting", siteSetting);
    }
    return siteSetting;
  }
};
