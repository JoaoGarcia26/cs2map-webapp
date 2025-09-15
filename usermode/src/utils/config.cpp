#include "pch.hpp"

static std::string json_get_string(const nlohmann::json& j, const char* key, const std::string& def = {})
{
    try {
        if (j.contains(key) && !j.at(key).is_null()) return j.at(key).get<std::string>();
    } catch (...) {}
    return def;
}

static bool json_get_bool(const nlohmann::json& j, const char* key, bool def = false)
{
    try {
        if (j.contains(key) && !j.at(key).is_null()) return j.at(key).get<bool>();
    } catch (...) {}
    return def;
}

static int json_get_int(const nlohmann::json& j, const char* key, int def = 0)
{
    try {
        if (j.contains(key) && !j.at(key).is_null()) return j.at(key).get<int>();
    } catch (...) {}
    return def;
}

bool cfg::setup(config_data_t& config_data)
{
    std::ifstream file("config.json");
    if (!file.is_open())
    {
        LOG_WARNING("cannot open file 'config.json'");

        std::ofstream example_config("config.json");
        example_config << std::format("{}", R"({
    "m_use_localhost": true,
    "m_local_ip": "192.168.x.x",
    "m_public_ip": "x.x.x.x",
    "m_firebase_api_key": "YOUR_FIREBASE_API_KEY",
    "m_ui_base": "https://seuapp.netlify.app",
    "m_relay_host": "relay.seudominio.com",
    "m_relay_port": 22006,
    "m_relay_path": "/cs2_webradar"
})");

        return {};
    }

    const auto parsed_data = nlohmann::json::parse(file, nullptr, false);
    if (parsed_data.is_discarded())
    {
        LOG_ERROR("failed to parse 'config.json'");
        return {};
    }

    try
    {
        config_data.m_use_localhost = json_get_bool(parsed_data, "m_use_localhost", true);
        config_data.m_local_ip      = json_get_string(parsed_data, "m_local_ip");
        config_data.m_public_ip     = json_get_string(parsed_data, "m_public_ip");
        config_data.m_firebase_api_key = json_get_string(parsed_data, "m_firebase_api_key");

        // Optional production fields
        config_data.m_ui_base    = json_get_string(parsed_data, "m_ui_base");
        config_data.m_relay_host = json_get_string(parsed_data, "m_relay_host");
        config_data.m_relay_port = json_get_int(parsed_data, "m_relay_port", 22006);
        config_data.m_relay_path = json_get_string(parsed_data, "m_relay_path", "/cs2_webradar");
    }
    catch (const std::exception& e)
    {
        LOG_ERROR("failed to deserialize 'config_data_t' (%s)", e.what());
        return {};
    }

    return true;
}
