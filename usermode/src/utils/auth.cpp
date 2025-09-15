#include "pch.hpp"
#include "auth.hpp"
#include <wincred.h>

namespace auth
{
    static size_t write_cb(void* contents, size_t size, size_t nmemb, void* userp)
    {
        const size_t total = size * nmemb;
        std::string* s = static_cast<std::string*>(userp);
        s->append(static_cast<char*>(contents), total);
        return total;
    }

    static bool prompt_credentials(std::string& email, std::string& password)
    {
        CREDUI_INFOA info = {};
        info.cbSize = sizeof(info);
        info.pszCaptionText = "Firebase Login";
        info.pszMessageText = "Enter your email and password";

        char user[CREDUI_MAX_USERNAME_LENGTH] = "";
        char pass[CREDUI_MAX_PASSWORD_LENGTH] = "";
        BOOL save = FALSE;

        const auto res = CredUIPromptForCredentialsA(
            &info,
            "firebase",
            nullptr,
            0,
            user,
            CREDUI_MAX_USERNAME_LENGTH,
            pass,
            CREDUI_MAX_PASSWORD_LENGTH,
            &save,
            CREDUI_FLAGS_GENERIC_CREDENTIALS |
                CREDUI_FLAGS_ALWAYS_SHOW_UI |
                CREDUI_FLAGS_DO_NOT_PERSIST);
        if (res != NO_ERROR)
            return false;

        email = user;
        password = pass;
        SecureZeroMemory(pass, sizeof(pass));
        return true;
    }

    bool login(const std::string& api_key)
    {
        std::string email, password;
        if (!prompt_credentials(email, password))
            return false;

        CURL* curl = curl_easy_init();
        if (!curl)
            return false;

        std::string response;
        const auto payload = nlohmann::json{
            {"email", email},
            {"password", password},
            {"returnSecureToken", true}
        }.dump();
        const auto url = std::format(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={}",
            api_key);

        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
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
            return json.contains("idToken");
        }
        catch (...)
        {
            return false;
        }
    }
}
