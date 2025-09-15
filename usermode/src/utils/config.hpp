#pragma once

struct config_data_t
{
    bool m_use_localhost{};
    std::string m_local_ip{};
    std::string m_public_ip{}; // may be domain or IP
    std::string m_username{};
    std::string m_password{};

    // Optional (production): separate relay and UI configuration
    std::string m_ui_base{};     // e.g. https://seuapp.netlify.app
    std::string m_relay_host{};  // e.g. relay.seudominio.com or IP
    int m_relay_port{22006};
    std::string m_relay_path{"/cs2_webradar"};
};

namespace cfg
{
    bool setup(config_data_t& config_data);
}
