#include "pch.hpp"
#include "auth.hpp"

namespace auth
{
    static size_t write_cb(void* contents, size_t size, size_t nmemb, void* userp)
    {
        const size_t total = size * nmemb;
        std::string* s = static_cast<std::string*>(userp);
        s->append(static_cast<char*>(contents), total);
        return total;
    }

    bool login(const std::string& username, const std::string& password)
    {
        CURL* curl = curl_easy_init();
        if (!curl)
            return false;

        std::string response;
        const std::string payload = nlohmann::json{{"username", username}, {"password", password}}.dump();

        curl_easy_setopt(curl, CURLOPT_URL, "http://localhost:8080/api/login");
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        const CURLcode res = curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
        if (res != CURLE_OK)
            return false;

        try
        {
            const auto json = nlohmann::json::parse(response);
            return json.contains("token");
        }
        catch (...)
        {
            return false;
        }
    }
}
