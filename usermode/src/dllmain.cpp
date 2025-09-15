#include "pch.hpp"
#include <random>

bool main()
{
    if (!utils::is_updated())
        return {};

    config_data_t config_data = {};
    if (!cfg::setup(config_data))
    {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        return {};
    }
    LOG_INFO("config system initialization completed");

    if (!auth::login(config_data.m_username, config_data.m_password))
    {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        return {};
    }
    LOG_INFO("login completed");

    if (!exc::setup())
    {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        return {};
    }
    LOG_INFO("exception handler initialization completed");

    if (!m_memory->setup())
    {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        return {};
    }
    LOG_INFO("memory initialization completed");

    if (!i::setup())
    {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        return {};
    }
    LOG_INFO("interfaces initialization completed");

    if (!schema::setup())
    {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        return {};
    }
    LOG_INFO("schema initialization completed");

    WSADATA wsa_data = {};
    const auto wsa_startup = WSAStartup(MAKEWORD(2, 2), &wsa_data);
    if (wsa_startup != 0)
    {
        std::this_thread::sleep_for(std::chrono::seconds(5));
        return {};
    }
    LOG_INFO("winsock initialization completed");

    const auto ipv4_address = utils::get_ipv4_address(config_data);
    if (ipv4_address.empty())
        LOG_WARNING("failed to get an address! please set 'm_local_ip' or 'm_public_ip' in config.json");

    // Generate a room id and token for this session
    auto gen_room = []() {
        static constexpr const char* cs = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        std::mt19937 rng{ std::random_device{}() };
        std::uniform_int_distribution<size_t> dist(0, 61);
        std::string r; r.reserve(12);
        for (int i = 0; i < 12; ++i) r.push_back(cs[dist(rng)]);
        return r;
    };
    const auto room_id = gen_room();
    auto gen_token = []() {
        static constexpr const char* cs = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        std::mt19937 rng{ std::random_device{}() };
        std::uniform_int_distribution<size_t> dist(0, 61);
        std::string t; t.reserve(32);
        for (int i = 0; i < 32; ++i) t.push_back(cs[dist(rng)]);
        return t;
    };
    const auto token = gen_token();

    // Resolve relay connection params
    const auto relay_host = !config_data.m_relay_host.empty() ? config_data.m_relay_host : ipv4_address;
    const auto relay_port = config_data.m_relay_port > 0 ? config_data.m_relay_port : 22006;
    std::string relay_path = config_data.m_relay_path.empty() ? std::string("/cs2_webradar") : config_data.m_relay_path;
    if (!relay_path.empty() && relay_path.front() != '/') relay_path = "/" + relay_path;

    const auto formatted_address = std::format("ws://{}:{}{}?role=producer&room={}&t={}", relay_host, relay_port, relay_path, room_id, token);
    static auto web_socket = easywsclient::WebSocket::from_url(formatted_address);
    if (!web_socket)
    {
        LOG_ERROR("failed to connect to the web socket ('%s')", formatted_address.c_str());
        return {};
    }
    LOG_INFO("connected to the web socket ('%s')", formatted_address.data());

    // Construct a shareable link for the viewer
    const auto relay_url = std::format("ws://{}:{}{}", relay_host, relay_port, relay_path);
    auto build_share_link = [&]() -> std::string {
        if (!config_data.m_ui_base.empty())
        {
            std::string base = config_data.m_ui_base;
            if (base.back() == '/') base.pop_back();
            return std::format("{}/r/{}?t={}&relay={}", base, room_id, token, relay_url);
        }
        const bool is_local = (ipv4_address == "localhost");
        if (is_local)
            return std::format("http://localhost:5173/r/{}?t={}&relay={}", room_id, token, relay_url);
        // Heuristic: domains -> https, raw IP -> http with dev port
        const bool has_alpha = std::regex_search(ipv4_address, std::regex("[A-Za-z]"));
        if (has_alpha)
            return std::format("https://{}/r/{}?t={}&relay={}", ipv4_address, room_id, token, relay_url);
        return std::format("http://{}:5173/r/{}?t={}&relay={}", ipv4_address, room_id, token, relay_url);
    };
    const auto share_link = build_share_link();
    LOG_INFO("share this link with viewers: %s", share_link.c_str());
    MessageBoxA(nullptr, share_link.c_str(), "cs2_webradar share link", MB_OK);

    auto start = std::chrono::system_clock::now();

    for (;;)
    {
        const auto now = std::chrono::system_clock::now();
        const auto duration = now - start;
        if (duration >= std::chrono::milliseconds(100))
        {
            start = now;

            sdk::update();
            f::run();

            web_socket->send(f::m_data.dump());
        }

        web_socket->poll();
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }

    system("pause");

    return true;
}
