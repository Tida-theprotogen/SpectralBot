console.log("Welcome to SpectralBot!");

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const { execFile, spawn } = require("child_process");


const CLIENT_ID = "1476709412235120807";


const OWNER_ID = "899758039446478848";

const BASE_PATH = __dirname;

const TOKEN_PATH = path.join(
  BASE_PATH,
  "token.txt"
);

const configPath = path.join(
  BASE_PATH,
  "config.json"
);

const logsPath = path.join(
  BASE_PATH,
  "SpectralBotLogs.txt"
);

const applicantsPath = path.join(
  BASE_PATH,
  "nflblc-applicants.txt"
);

const applicationsPath = path.join(
  BASE_PATH,
  "nflblc-applications.json"
);

const globalAnnouncementLogPath = path.join(
  BASE_PATH,
  "global-annlog.txt"
);


function loadToken() {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      console.error(
        `ERROR: ${TOKEN_PATH} does not exist.`
      );

      console.error(
        "Create token.txt in the same directory as index.js and put your Discord bot token inside it."
      );

      process.exit(1);
    }

    const token =
      fs.readFileSync(
        TOKEN_PATH,
        "utf8"
      ).trim();

    if (!token) {
      console.error(
        "ERROR: token.txt is empty."
      );

      console.error(
        "Put your Discord bot token inside token.txt."
      );

      process.exit(1);
    }

    return token;
  } catch (error) {
    console.error(
      "ERROR: Failed to read token.txt:",
      error
    );

    process.exit(1);
  }
}

const TOKEN = loadToken();


const COLORS = {
  primary: 0x7289da,
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x5865f2
};


const EMOJIS = {
  success: "<:SBSuccess:1480415704225288326>",
  error: "<:SBFail:1480415701650112582>",
  warning: "<:SBErr:1480415697275195444>",
  mute: "<:SBD:1480415709753249835>"
};


const APPLICATION_QUESTIONS = [
  "Question I: Do you play on Standalone Quest?",

  "Question II: What is the link to your ScoreSaber profile?",

  "Question III: Do you understand that your opponents are randomised?"
];


const activeApplications = new Map();


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],

  partials: [
    Partials.Channel
  ]
});


function ensureFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        "",
        "utf8"
      );
    }
  } catch (error) {
    console.error(
      `Failed to create ${filePath}:`,
      error
    );
  }
}

function ensureJsonFile(
  filePath,
  defaultValue
) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          defaultValue,
          null,
          2
        ),
        "utf8"
      );
    }
  } catch (error) {
    console.error(
      `Failed to create ${filePath}:`,
      error
    );
  }
}

ensureFile(logsPath);
ensureFile(applicantsPath);
ensureFile(globalAnnouncementLogPath);

ensureJsonFile(
  configPath,
  {}
);

ensureJsonFile(
  applicationsPath,
  {}
);


function loadConfig() {
  try {
    return JSON.parse(
      fs.readFileSync(
        configPath,
        "utf8"
      )
    );
  } catch (error) {
    console.error(
      "Failed to load config:",
      error
    );

    return {};
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config,
        null,
        2
      ),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to save config:",
      error
    );

    return false;
  }
}

function ensureGuildConfig(guildId) {
  const config = loadConfig();

  if (!config[guildId]) {
    config[guildId] = {
      disabled: [],
      flagSystem: true
    };
  }

  if (
    !Array.isArray(
      config[guildId].disabled
    )
  ) {
    config[guildId].disabled = [];
  }

  if (
    typeof config[guildId].flagSystem !==
    "boolean"
  ) {
    config[guildId].flagSystem = true;
  }

  saveConfig(config);

  return config;
}

function isDisabled(
  guildId,
  command
) {
  const config = loadConfig();

  return (
    config[guildId]?.disabled?.includes(
      command
    ) === true
  );
}


function appendToFile(
  filePath,
  content
) {
  try {
    fs.appendFileSync(
      filePath,
      content,
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(
      `Failed to write to ${filePath}:`,
      error
    );

    return false;
  }
}

function logAction(
  type,
  guild,
  moderator,
  action
) {
  const log = `
SpectralBot logs:

${type}:
Server: ${guild}
Moderator: ${moderator}
Action taken: ${action}

-------------------------
`;

  appendToFile(
    logsPath,
    log
  );
}

function logGlobalAnnouncement(
  moderator,
  messageText,
  serverResults
) {
  const log = `
SpectralBot Global Announcement
===============================

Moderator:
${moderator}

Message:
${messageText}

Servers:
${serverResults
  .map(
    result =>
      `${result.guild}: ${result.status}`
  )
  .join("\n")}

Time:
${new Date().toISOString()}

-------------------------
`;

  appendToFile(
    globalAnnouncementLogPath,
    log
  );
}


function loadApplications() {
  try {
    return JSON.parse(
      fs.readFileSync(
        applicationsPath,
        "utf8"
      )
    );
  } catch (error) {
    console.error(
      "Failed to load applications:",
      error
    );

    return {};
  }
}

function saveApplications(
  applications
) {
  try {
    fs.writeFileSync(
      applicationsPath,
      JSON.stringify(
        applications,
        null,
        2
      ),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to save applications:",
      error
    );

    return false;
  }
}

function createApplicationId() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}

function getApplication(
  applicationId
) {
  const applications =
    loadApplications();

  return (
    applications[applicationId] ??
    null
  );
}

function updateApplication(
  applicationId,
  updates
) {
  const applications =
    loadApplications();

  if (
    !applications[applicationId]
  ) {
    return false;
  }

  applications[applicationId] = {
    ...applications[applicationId],
    ...updates
  };

  return saveApplications(
    applications
  );
}


function isOwner(user) {
  return (
    user &&
    user.id === OWNER_ID
  );
}

function hasPermission(
  message,
  permission
) {
  return (
    message.member &&
    message.member.permissions.has(
      permission
    )
  );
}

function getMentionedMember(
  message
) {
  return (
    message.mentions.members.first() ??
    null
  );
}

async function safeReply(
  message,
  content
) {
  try {
    return await message.reply(
      content
    );
  } catch (error) {
    console.error(
      "Failed to send reply:",
      error
    );

    return null;
  }
}

async function safeDM(
  user,
  content,
  options = {}
) {
  try {
    return await user.send({
      content,
      ...options
    });
  } catch (error) {
    console.error(
      `Failed to DM ${user.tag}:`,
      error
    );

    return null;
  }
}

function truncate(
  text,
  maxLength
) {
  const value =
    String(text ?? "");

  if (
    value.length <= maxLength
  ) {
    return value;
  }

  return (
    value.slice(
      0,
      maxLength - 3
    ) + "..."
  );
}


async function shutdownBot() {
  try {
    await client.destroy();
  } catch (error) {
    console.error(
      "Failed to destroy Discord client:",
      error
    );
  }

  process.exit(0);
}

function scheduleRestart() {
  const scriptPath =
    path.join(
      BASE_PATH,
      "newdex.js"
    );


  const restartProcess =
    spawn(
      "bash",
      [
        "-lc",
        `sleep 2; exec "${process.execPath}" "${scriptPath}"`
      ],
      {
        cwd:
          BASE_PATH,
        detached:
          true,
        stdio:
          "ignore"
      }
    );

  restartProcess.unref();
}


function runFastfetch() {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      execFile(
        "fastfetch",
        [
          "--json",
          "--structure",
          "os:kernel:cpu:memory:cpuusage:uptime:de"
        ],
        {
          timeout: 15000,
          maxBuffer:
            4 * 1024 * 1024
        },
        (
          error,
          stdout,
          stderr
        ) => {
          if (error) {
            console.error(
              "Fastfetch failed:"
            );

            console.error(
              stderr ||
              error.message
            );

            reject(error);
            return;
          }

          try {
            resolve(
              JSON.parse(
                stdout
              )
            );
          } catch (
            parseError
          ) {
            console.error(
              "Fastfetch returned invalid JSON."
            );

            console.error(
              stdout
            );

            reject(
              parseError
            );
          }
        }
      );
    }
  );
}

function getFastfetchModule(
  data,
  type
) {
  const module =
    data.find(
      item =>
        item?.type?.toLowerCase() ===
        type.toLowerCase()
    );

  return (
    module?.result ??
    null
  );
}

async function getHostInfo() {
  const data =
    await runFastfetch();

  const os =
    getFastfetchModule(
      data,
      "OS"
    );

  const kernel =
    getFastfetchModule(
      data,
      "Kernel"
    );

  const cpu =
    getFastfetchModule(
      data,
      "CPU"
    );

  const memory =
    getFastfetchModule(
      data,
      "Memory"
    );

  const cpuUsage =
    getFastfetchModule(
      data,
      "CPUUsage"
    );

  const uptime =
    getFastfetchModule(
      data,
      "Uptime"
    );

  const desktop =
    getFastfetchModule(
      data,
      "DE"
    );

  const operatingSystem =
    os?.prettyName ||
    os?.name ||
    "Unknown";

  const kernelText =
    kernel?.release ||
    "Unknown";

  let cpuText =
    "Unknown";

  if (cpu?.cpu) {
    cpuText =
      cpu.cpu;

    const physical =
      cpu.cores?.physical;

    const logical =
      cpu.cores?.logical;

    if (
      typeof physical ===
        "number" &&
      typeof logical ===
        "number"
    ) {
      cpuText +=
        `\n${physical} cores / ${logical} threads`;
    }

    if (
      typeof cpu.frequency?.max ===
        "number"
    ) {
      cpuText +=
        ` • ${cpu.frequency.max} MHz max`;
    }
  }

  let memoryText =
    "Unknown";

  if (
    typeof memory?.used ===
      "number" &&
    typeof memory?.total ===
      "number"
  ) {
    const usedGiB =
      memory.used /
      1024 /
      1024 /
      1024;

    const totalGiB =
      memory.total /
      1024 /
      1024 /
      1024;

    const percentage =
      memory.total > 0
        ? (
            memory.used /
            memory.total
          ) *
          100
        : 0;

    memoryText =
      `${usedGiB.toFixed(2)} GiB / ` +
      `${totalGiB.toFixed(2)} GiB ` +
      `(${percentage.toFixed(1)}%)`;
  }

  let cpuUsageText =
    "Unknown";

  if (
    Array.isArray(
      cpuUsage
    ) &&
    cpuUsage.length > 0
  ) {
    const values =
      cpuUsage.filter(
        value =>
          typeof value ===
            "number" &&
          Number.isFinite(
            value
          )
      );

    if (
      values.length > 0
    ) {
      const average =
        values.reduce(
          (
            sum,
            value
          ) =>
            sum + value,
          0
        ) /
        values.length;

      cpuUsageText =
        `${average.toFixed(1)}%`;
    }
  }

  let uptimeText =
    "Unknown";

  if (
    typeof uptime?.uptime ===
      "number"
  ) {
    let seconds =
      Math.floor(
        uptime.uptime /
          1000
      );

    const days =
      Math.floor(
        seconds / 86400
      );

    seconds %= 86400;

    const hours =
      Math.floor(
        seconds / 3600
      );

    seconds %= 3600;

    const minutes =
      Math.floor(
        seconds / 60
      );

    seconds %= 60;

    const parts = [];

    if (days > 0) {
      parts.push(
        `${days}d`
      );
    }

    if (hours > 0) {
      parts.push(
        `${hours}h`
      );
    }

    if (minutes > 0) {
      parts.push(
        `${minutes}m`
      );
    }

    if (
      seconds > 0 ||
      parts.length === 0
    ) {
      parts.push(
        `${seconds}s`
      );
    }

    uptimeText =
      parts.join(" ");
  }

  const desktopText =
    desktop?.prettyName ||
    desktop?.processName ||
    "Unknown";

  return {
    os:
      operatingSystem,
    kernel:
      kernelText,
    cpu:
      cpuText,
    memory:
      memoryText,
    cpuUsage:
      cpuUsageText,
    uptime:
      uptimeText,
    desktop:
      desktopText
  };
}


function buildApplicationReview(
  application
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "NFLBLC Application Review"
      )
      .setDescription(
        [
          `Application ID: \`${application.applicationId}\``,
          "",
          "A new NFLBLC application is ready for review."
        ].join("\n")
      )
      .setColor(
        COLORS.warning
      )
      .addFields(
        {
          name:
            "Applicant",
          value:
            `${application.userTag}\n<@${application.userId}>`,
          inline:
            true
        },
        {
          name:
            "User ID",
          value:
            application.userId,
          inline:
            true
        },
        {
          name:
            "Server",
          value:
            application.sourceGuild ||
            "Unknown",
          inline:
            true
        },
        {
          name:
            "Question I",
          value:
            truncate(
              application.answers[0] ||
                "No answer",
              1024
            )
        },
        {
          name:
            "Question II",
          value:
            truncate(
              application.answers[1] ||
                "No answer",
              1024
            )
        },
        {
          name:
            "Question III",
          value:
            truncate(
              application.answers[2] ||
                "No answer",
              1024
            )
        }
      )
      .setTimestamp();

  const buttons =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `nflblc_accept:${application.applicationId}`
          )
          .setLabel(
            "Accept"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            `nflblc_deny:${application.applicationId}`
          )
          .setLabel(
            "Deny"
          )
          .setStyle(
            ButtonStyle.Danger
          )
      );

  return {
    embeds: [
      embed
    ],
    components: [
      buttons
    ]
  };
}


function formatApplication(
  application
) {
  return `
NFLBLC Application
==================

Application ID:
${application.applicationId}

User:
${application.userTag}

User ID:
${application.userId}

Server:
${application.sourceGuild || "Unknown"}

Started:
${application.startedAt}

Completed:
${application.completedAt}

Status:
Pending Review

${APPLICATION_QUESTIONS
  .map(
    (
      question,
      index
    ) =>
      `${question}\nAnswer: ${application.answers[index]}`
  )
  .join("\n\n")}

-------------------------
`;
}


async function notifyOwner(
  application
) {
  try {
    const owner =
      await client.users.fetch(
        OWNER_ID
      );

    return await owner.send(
      buildApplicationReview(
        application
      )
    );
  } catch (error) {
    console.error(
      "Failed to notify owner:",
      error
    );

    return null;
  }
}


async function startApplication(
  user,
  sourceGuild
) {
  if (
    activeApplications.has(
      user.id
    )
  ) {
    return {
      success:
        false,
      reason:
        "already_active"
    };
  }

  const applicationId =
    createApplicationId();

  const startedAt =
    new Date();

  const application = {
    applicationId,
    userId:
      user.id,
    userTag:
      user.tag,
    answers: [],
    questionIndex:
      0,
    startedAt:
      startedAt.toISOString(),
    completedAt:
      null,
    sourceGuild:
      sourceGuild?.name ||
      "DM / Unknown"
  };

  const applications =
    loadApplications();

  applications[
    applicationId
  ] = {
    ...application,
    status:
      "pending",
    decision:
      null,
    decidedAt:
      null,
    decidedBy:
      null
  };

  if (
    !saveApplications(
      applications
    )
  ) {
    return {
      success:
        false,
      reason:
        "storage_failed"
    };
  }

  activeApplications.set(
    user.id,
    application
  );

  const dm =
    await safeDM(
      user,
      [
        "**NFLBLC Application**",
        "",
        "SpectralBot will ask you three questions.",
        "Please answer each question one at a time.",
        "",
        APPLICATION_QUESTIONS[0]
      ].join("\n")
    );

  if (!dm) {
    activeApplications.delete(
      user.id
    );

    updateApplication(
      applicationId,
      {
        status:
          "cancelled",
        decision:
          "dm_failed",
        decidedAt:
          new Date().toISOString()
      }
    );

    return {
      success:
        false,
      reason:
        "dm_failed"
    };
  }

  return {
    success:
      true,
    applicationId
  };
}


async function completeApplication(
  application
) {
  const completedAt =
    new Date();

  application.completedAt =
    completedAt.toISOString();

  const applications =
    loadApplications();

  const stored =
    applications[
      application.applicationId
    ];

  if (stored) {
    stored.answers =
      application.answers;

    stored.completedAt =
      application.completedAt;

    stored.status =
      "pending";
  }

  saveApplications(
    applications
  );

  appendToFile(
    applicantsPath,
    formatApplication(
      application
    )
  );

  activeApplications.delete(
    application.userId
  );

  const ownerMessage =
    await notifyOwner(
      application
    );

  if (!ownerMessage) {
    console.error(
      `Could not notify owner about application ${application.applicationId}.`
    );
  }

  await safeDM(
    {
      id:
        application.userId,
      tag:
        application.userTag,
      send:
        (...args) =>
          client.users.fetch(
            application.userId
          ).then(
            user =>
              user.send(
                ...args
              )
          )
    },
    [
      EMOJIS.success,
      "Your NFLBLC application has been submitted.",
      "",
      "It is now awaiting review."
    ].join(" ")
  );
}


client.on(
  "messageCreate",
  async message => {
    if (
      message.author.bot
    ) {
      return;
    }

    if (
      message.guild
    ) {
      return;
    }

    const application =
      activeApplications.get(
        message.author.id
      );

    if (!application) {
      return;
    }

    const answer =
      message.content.trim();

    if (!answer) {
      await safeDM(
        message.author,
        "Please provide an answer before continuing."
      );

      return;
    }

    application.answers.push(
      answer
    );

    application.questionIndex++;

    const nextQuestion =
      APPLICATION_QUESTIONS[
        application.questionIndex
      ];

    if (nextQuestion) {
      await safeDM(
        message.author,
        nextQuestion
      );

      return;
    }

    await completeApplication(
      application
    );
  }
);


async function resolveApplication(
  interaction,
  applicationId,
  decision
) {
  if (
    !isOwner(
      interaction.user
    )
  ) {
    await interaction.reply({
      content:
        `${EMOJIS.error} Only the SpectralBot owner can accept or deny applications.`,
      ephemeral:
        true
    });

    return;
  }

  const application =
    getApplication(
      applicationId
    );

  if (!application) {
    await interaction.reply({
      content:
        `${EMOJIS.error} Application not found.`,
      ephemeral:
        true
    });

    return;
  }

  if (
    application.status !==
    "pending"
  ) {
    await interaction.reply({
      content:
        `${EMOJIS.warning} This application has already been ${application.status}.`,
      ephemeral:
        true
    });

    return;
  }

  const now =
    new Date();

  const success =
    updateApplication(
      applicationId,
      {
        status:
          decision,
        decision:
          decision,
        decidedAt:
          now.toISOString(),
        decidedBy:
          interaction.user.id
      }
    );

  if (!success) {
    await interaction.reply({
      content:
        `${EMOJIS.error} Failed to update the application.`,
      ephemeral:
        true
    });

    return;
  }

  const applicant =
    await client.users.fetch(
      application.userId
    ).catch(
      () =>
        null
    );

  if (applicant) {
    if (
      decision ===
      "accepted"
    ) {
      await safeDM(
        applicant,
        [
          `${EMOJIS.success} **Your NFLBLC application has been accepted!**`,
          "",
          "Welcome to NFLBLC."
        ].join("\n")
      );
    } else {
      await safeDM(
        applicant,
        [
          `${EMOJIS.warning} **Your NFLBLC application has been denied.**`,
          "",
          "If you believe this was a mistake, please contact NFLBLC staff."
        ].join("\n")
      );
    }
  }

  appendToFile(
    applicantsPath,
    `
Application Decision
====================

Application ID:
${applicationId}

User:
${application.userTag}

User ID:
${application.userId}

Decision:
${decision}

Decided By:
${interaction.user.tag} (${interaction.user.id})

Time:
${now.toISOString()}

-------------------------
`
  );

  const resultEmbed =
    new EmbedBuilder()
      .setTitle(
        decision ===
          "accepted"
          ? "NFLBLC Application — Accepted"
          : "NFLBLC Application — Denied"
      )
      .setDescription(
        `Application ID: \`${applicationId}\``
      )
      .setColor(
        decision ===
          "accepted"
          ? COLORS.success
          : COLORS.error
      )
      .addFields(
        {
          name:
            "Applicant",
          value:
            `${application.userTag}\n<@${application.userId}>`,
          inline:
            true
        },
        {
          name:
            "Decision",
          value:
            decision ===
              "accepted"
              ? "Accepted"
              : "Denied",
          inline:
            true
        },
        {
          name:
            "Decided By",
          value:
            interaction.user.tag,
          inline:
            true
        }
      )
      .setTimestamp(
        now
      );

  const disabledButton =
    new ButtonBuilder()
      .setCustomId(
        `nflblc_resolved:${applicationId}`
      )
      .setLabel(
        decision ===
          "accepted"
          ? "Accepted"
          : "Denied"
      )
      .setStyle(
        decision ===
          "accepted"
          ? ButtonStyle.Success
          : ButtonStyle.Danger
      )
      .setDisabled(
        true
      );

  const row =
    new ActionRowBuilder()
      .addComponents(
        disabledButton
      );

  await interaction.update({
    embeds: [
      resultEmbed
    ],
    components: [
      row
    ]
  });
}


client.once(
  "ready",
  async () => {
    console.log(
      `SpectralBot online as ${client.user.tag}`
    );

    console.log(
      `Connected to ${client.guilds.cache.size} guild(s).`
    );

    await registerSlashCommands();
  }
);


client.on(
  "guildCreate",
  async guild => {
    console.log(
      `Joined guild: ${guild.name} (${guild.id})`
    );

    ensureGuildConfig(
      guild.id
    );

    try {
      const statusChannel =
        guild.channels.cache.find(
          channel =>
            channel.name ===
            "spectralbot-status"
        );

      if (statusChannel) {
        await statusChannel.delete(
          "Removed by SpectralBot."
        );
      }
    } catch (error) {
      console.error(
        "Failed to remove status channel:",
        error
      );
    }

    try {
      if (
        guild.systemChannel
      ) {
        await guild.systemChannel.send(
          [
            "SpectralBot has joined this server!",
            "",
            "Run `!help` to see available commands."
          ].join("\n")
        );
      }
    } catch (error) {
      console.error(
        "Failed to send welcome message:",
        error
      );
    }
  }
);


async function handleHelp(
  message
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "SpectralBot Commands"
      )
      .setColor(
        COLORS.primary
      )
      .addFields(
        {
          name:
            "Information",
          value:
            "`!hostinf` - Host information (dev-only)"
        },
        {
          name:
            "Applications",
          value:
            "`!apply` — Start an NFLBLC application"
        },
        {
          name:
            "Moderation",
          value:
            "`!ban @user [reason]`\n" +
            "`!kick @user [reason]`\n" +
            "`!mute @user`\n" +
            "`!flag @user [reason]`\n" +
            "`!unflag @user`"
        },
        {
          name:
            "Announcements",
          value:
            "`!announce \"message\"`\n" +
            "`!forceannounce #channel message`\n" +
            "`!globalannounce #channel message`"
        },
        {
          name:
            "Configuration",
          value:
            "`!config status`\n" +
            "`!config flags enable/disable`\n" +
            "`!config command <command> enable/disable`"
        },
        {
          name:
            "Owner",
          value:
            "`!hostinf`\n" +
            "`!killbot`\n" +
            "`!restartbot`\n" +
            "`!forceban`\n" +
            "`!forcekick`\n" +
            "`!forcemute`\n" +
            "`!forceannounce`\n" +
            "`!forceviewlogs`\n" +
            "`!globalannounce`"
        }
      )
      .setFooter({
        text:
          "SpectralBot"
      });

  return message.reply({
    embeds: [
      embed
    ]
  });
}


client.on(
  "messageCreate",
  async message => {
    if (
      message.author.bot
    ) {
      return;
    }

    if (
      !message.guild
    ) {
      return;
    }

    if (
      !message.content.startsWith(
        "!"
      )
    ) {
      return;
    }

    const parts =
      message.content
        .slice(1)
        .trim()
        .split(/\s+/);

    const command =
      parts.shift()?.toLowerCase();

    const args =
      parts;

    if (!command) {
      return;
    }

    const guildId =
      message.guild.id;

    ensureGuildConfig(
      guildId
    );


    if (
      command ===
      "killbot"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} This command is only for the bot developer.`
        );
      }

      await safeReply(
        message,
        `${EMOJIS.success} SpectralBot is shutting down...`
      );

      console.log(
        `KILLBOT: Shutdown requested by ${message.author.tag} (${message.author.id}).`
      );

      setTimeout(
        async () => {
          await shutdownBot();
        },
        1000
      );

      return;
    }


if (command === "restartbot") {
  if (!isOwner(message.author)) {
    return safeReply(
      message,
      `${EMOJIS.error} This command is only for the bot developer.`
    );
  }

  await safeReply(
    message,
    `${EMOJIS.success} SpectralBot is restarting...`
  );

  console.log(
    `RESTARTBOT: Restart requested by ${message.author.tag} (${message.author.id}).`
  );

  scheduleRestart();
  setTimeout(async () => {
    await shutdownBot();
  }, 1000);

  return;
}




    if (
      command ===
      "hostinf"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} This command is only for the bot developer.`
        );
      }

      try {
        const info =
          await getHostInfo();

        const embed =
          new EmbedBuilder()
            .setTitle(
              "Host Information"
            )
            .setDescription(
              "System information for the SpectralBot host"
            )
            .setColor(
              COLORS.primary
            )
            .addFields(
              {
                name:
                  "Operating System",
                value:
                  info.os,
                inline:
                  true
              },
              {
                name:
                  "Kernel",
                value:
                  info.kernel,
                inline:
                  true
              },
              {
                name:
                  "CPU",
                value:
                  info.cpu,
                inline:
                  false
              },
              {
                name:
                  "Memory",
                value:
                  info.memory,
                inline:
                  true
              },
              {
                name:
                  "CPU Usage",
                value:
                  info.cpuUsage,
                inline:
                  true
              },
              {
                name:
                  "Uptime",
                value:
                  info.uptime,
                inline:
                  true
              },
              {
                name:
                  "Desktop",
                value:
                  info.desktop,
                inline:
                  true
              }
            )
            .setFooter({
              text:
                "SpectralBot • Host Information"
            })
            .setTimestamp();

        return message.reply({
          embeds: [
            embed
          ]
        });
      } catch (
        error
      ) {
        console.error(
          "HOSTINF ERROR:",
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to retrieve host information. Check the SpectralBot console for details.`
        );
      }
    }


    if (
      isDisabled(
        guildId,
        command
      )
    ) {
      return safeReply(
        message,
        `${EMOJIS.error} Command disabled or no permission.`
      );
    }


    if (
      command ===
      "help"
    ) {
      return handleHelp(
        message
      );
    }


    if (
      command ===
      "apply"
    ) {
      const result =
        await startApplication(
          message.author,
          message.guild
        );

      if (
        !result.success
      ) {
        if (
          result.reason ===
          "already_active"
        ) {
          return safeReply(
            message,
            `${EMOJIS.warning} You already have an active application active.`
          );
        }

        if (
          result.reason ===
          "dm_failed"
        ) {
          return safeReply(
            message,
            `${EMOJIS.error} I couldn't DM you. Please make sure your Discord privacy settings allow DMs from server members.`
          );
        }

        return safeReply(
          message,
          `${EMOJIS.error} Failed to create your application. Please contact the SpectralBot developer and then try again later.`
        );
      }

      return safeReply(
        message,
        `${EMOJIS.success} NFLBLC Cup-Series application has been sent to your DMs. If you did not get a DM, check if your DMs are enabled in this server or contact the SpectralBot developer.`
      );
    }


    if (
      command ===
      "ban"
    ) {
      if (
        !hasPermission(
          message,
          PermissionsBitField.Flags.BanMembers
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} You need the **Ban Members** permission.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!ban @user [reason]`"
        );
      }

      const reason =
        args
          .slice(1)
          .join(" ") ||
        "No reason provided.";

      try {
        await user.ban({
          reason
        });

        await safeReply(
          message,
          `${EMOJIS.success} User banned.`
        );

        logAction(
          "BAN",
          message.guild.name,
          message.author.tag,
          `${user.user.tag}: ${reason}`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to ban user. Check my permissions and role hierarchy.`
        );
      }

      return;
    }


    if (
      command ===
      "forceban"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} This command is only for the bot developer.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!forceban @user [reason]`"
        );
      }

      const reason =
        args
          .slice(1)
          .join(" ") ||
        "No reason provided.";

      try {
        await message.guild.members.ban(
          user.id,
          {
            reason
          }
        );

        await safeReply(
          message,
          `${EMOJIS.success} User force banned.`
        );

        logAction(
          "FORCE BAN",
          message.guild.name,
          message.author.tag,
          `${user.user.tag}: ${reason}`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to force ban user.`
        );
      }

      return;
    }


    if (
      command ===
      "kick"
    ) {
      if (
        !hasPermission(
          message,
          PermissionsBitField.Flags.KickMembers
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} You need the **Kick Members** permission.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!kick @user [reason]`"
        );
      }

      const reason =
        args
          .slice(1)
          .join(" ") ||
        "No reason provided.";

      try {
        await user.kick(
          reason
        );

        await safeReply(
          message,
          `${EMOJIS.success} User has been kicked.`
        );

        logAction(
          "KICK",
          message.guild.name,
          message.author.tag,
          `${user.user.tag}: ${reason}`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to kick user. Check my permissions and role hierarchy.`
        );
      }

      return;
    }


    if (
      command ===
      "forcekick"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} This command is only for the bot developer.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!forcekick @user [reason]`"
        );
      }

      const reason =
        args
          .slice(1)
          .join(" ") ||
        "No reason provided.";

      try {
        await user.kick(
          reason
        );

        await safeReply(
          message,
          `${EMOJIS.success} User force kicked.`
        );

        logAction(
          "FORCE KICK",
          message.guild.name,
          message.author.tag,
          `${user.user.tag}: ${reason}`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to force kick user.`
        );
      }

      return;
    }


    if (
      command ===
      "mute"
    ) {
      if (
        !hasPermission(
          message,
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} You need the **Moderate Members** permission.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!mute @user`"
        );
      }

      try {
        await user.timeout(
          60_000,
          "Muted via SpectralBot."
        );

        await safeReply(
          message,
          `${EMOJIS.mute} User muted for 60 seconds.`
        );

        logAction(
          "MUTE",
          message.guild.name,
          message.author.tag,
          `${user.user.tag}: 60 seconds`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to mute user.`
        );
      }

      return;
    }


    if (
      command ===
      "forcemute"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} This command is only for the SpectralBot developer.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!forcemute @user [milliseconds] [reason]`"
        );
      }

      const duration =
        Number.parseInt(
          args[1],
          10
        ) ||
        60_000;

      const reason =
        args
          .slice(2)
          .join(" ") ||
        "No reason provided.";

      const maxTimeout =
        28 *
        24 *
        60 *
        60 *
        1000;

      if (
        duration < 1 ||
        duration >
          maxTimeout
      ) {
        return safeReply(
          message,
          "Timeout duration must be between 1ms and 28 days."
        );
      }

      try {
        await user.timeout(
          duration,
          reason
        );

        await safeReply(
          message,
          `${EMOJIS.mute} User force muted.`
        );

        logAction(
          "FORCE MUTE",
          message.guild.name,
          message.author.tag,
          `${user.user.tag}: ${reason}`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to force mute user.`
        );
      }

      return;
    }


    if (
      command ===
      "flag"
    ) {
      const config =
        loadConfig();

      if (
        config[guildId]?.flagSystem ===
        false
      ) {
        return safeReply(
          message,
          `${EMOJIS.warning} The flag system is disabled.`
        );
      }

      if (
        !hasPermission(
          message,
          PermissionsBitField.Flags.ManageRoles
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} You need the **Manage Roles** permission.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!flag @user [reason]`"
        );
      }

      const reason =
        args
          .slice(1)
          .join(" ") ||
        "No reason provided.";

      try {
        let role =
          message.guild.roles.cache.find(
            role =>
              role.name ===
              "Flagged"
          );

        if (!role) {
          role =
            await message.guild.roles.create(
              {
                name:
                  "Flagged",
                color:
                  0xd68006,
                hoist:
                  true,
                reason:
                  "Auto-created by SpectralBot flag system. Needed for the !flag command-set."
              }
            );
        }

        const botMember =
          message.guild.members.me;

        if (!botMember) {
          return safeReply(
            message,
            `${EMOJIS.error} Could not check for permissions.`
          );
        }

        if (
          role.position >=
          botMember.roles.highest.position
        ) {
          return safeReply(
            message,
            `${EMOJIS.error} The \`Flagged\` role is above my highest role. Please ask a higher-up to fix the issue.`
          );
        }

        if (
          user.roles.cache.has(
            role.id
          )
        ) {
          return safeReply(
            message,
            `${EMOJIS.warning} ${user.user.tag} is already flagged.`
          );
        }

        await user.roles.add(
          role,
          `Flagged by ${message.author.tag}: ${reason}`
        );

        await safeReply(
          message,
          `${EMOJIS.warning} Flagged ${user.user.tag}: ${reason}`
        );

        logAction(
          "FLAG",
          message.guild.name,
          message.author.tag,
          `${user.user.tag}: ${reason}`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to assign the Flagged role.`
        );
      }

      return;
    }


    if (
      command ===
      "unflag"
    ) {
      if (
        !hasPermission(
          message,
          PermissionsBitField.Flags.ManageRoles
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} You need the **Manage Roles** permission.`
        );
      }

      const user =
        getMentionedMember(
          message
        );

      if (!user) {
        return safeReply(
          message,
          "Usage: `!unflag @user`"
        );
      }

      const role =
        message.guild.roles.cache.find(
          role =>
            role.name ===
            "Flagged"
        );

      if (!role) {
        return safeReply(
          message,
          "The `Flagged` role doesn't exist."
        );
      }

      try {
        if (
          !user.roles.cache.has(
            role.id
          )
        ) {
          return safeReply(
            message,
            `${EMOJIS.warning} ${user.user.tag} isn't flagged.`
          );
        }

        await user.roles.remove(
          role,
          `Unflagged by ${message.author.tag}`
        );

        await safeReply(
          message,
          `${EMOJIS.success} Unflagged ${user.user.tag}.`
        );

        logAction(
          "UNFLAG",
          message.guild.name,
          message.author.tag,
          user.user.tag
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to remove the Flagged role.`
        );
      }

      return;
    }


    if (
      command ===
      "announce"
    ) {
      if (
        !hasPermission(
          message,
          PermissionsBitField.Flags.ManageGuild
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} You need the **Manage Server** permission.`
        );
      }

      const match =
        message.content.match(
          /^!announce\s+"([\s\S]+)"$/i
        );

      if (!match) {
        return safeReply(
          message,
          'Usage: `!announce "Your announcement here"`'
        );
      }

      try {
        await message.channel.send(
          `## Announcement\n${match[1]}`
        );

        logAction(
          "ANNOUNCE",
          message.guild.name,
          message.author.tag,
          match[1]
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to send announcement.`
        );
      }

      return;
    }


    if (
      command ===
      "forceannounce"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} This command is only for the bot developer.`
        );
      }

      const channel =
        message.mentions.channels.first();

      if (!channel) {
        return safeReply(
          message,
          "Usage: `!forceannounce #channel message`"
        );
      }

      const text =
        message.content
          .replace(
            /^!forceannounce/i,
            ""
          )
          .replace(
            `<#${channel.id}>`,
            ""
          )
          .trim();

      if (!text) {
        return safeReply(
          message,
          "Announcement text not specified."
        );
      }

      try {
        await channel.send(
          `## Announcement from SpectralBot\n${text}\n\n-# Forced announcement by bot developer.`
        );

        return safeReply(
          message,
          `${EMOJIS.success} Announcement sent.`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to send announcement.`
        );
      }
    }


    if (
      command ===
      "globalannounce"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} This command is only for the bot developer.`
        );
      }

      const textWithoutCommand =
        message.content.replace(
          /^!globalannounce/i,
          ""
        ).trim();

      const channelMention =
        message.mentions.channels.first();

      if (
        !channelMention
      ) {
        return safeReply(
          message,
          "Usage: `!globalannounce #channel message`"
        );
      }

      const announcementText =
        textWithoutCommand
          .replace(
            `<#${channelMention.id}>`,
            ""
          )
          .trim();

      if (
        !announcementText
      ) {
        return safeReply(
          message,
          "No announcement text was specified."
        );
      }

      const results = [];

      for (
        const guild of
        client.guilds.cache.values()
      ) {
        try {
          let channel =
            guild.channels.cache.find(
              existingChannel =>
                existingChannel.name ===
                "spectralbot-announcements" &&
                existingChannel.type ===
                ChannelType.GuildText
            );

          if (!channel) {
            channel =
              await guild.channels.create(
                {
                  name:
                    "spectralbot-announcements",
                  type:
                    ChannelType.GuildText,
                  topic:
                    "Global announcements from SpectralBot.",
                  reason:
                    "Created for SpectralBot global announcements. Required for the !globalannounce command set."
                }
              );
          }

          if (
            !channel
              .permissionsFor(
                guild.members.me
              )
              ?.has(
                PermissionsBitField.Flags.SendMessages
              )
          ) {
            results.push({
              guild:
                guild.name,
              status:
                "No permission"
            });

            continue;
          }

          await channel.send(
            [
              "## Global Announcement",
              announcementText,
              "",
              "-# Global announcement from SpectralBot developer."
            ].join("\n")
          );

          results.push({
            guild:
              guild.name,
            status:
              "Sent"
          });
        } catch (
          error
        ) {
          console.error(
            `Global announcement failed in ${guild.name}:`,
            error
          );

          results.push({
            guild:
              guild.name,
            status:
              `Failed — ${error.message}`
          });
        }
      }

      logGlobalAnnouncement(
        message.author.tag,
        announcementText,
        results
      );

      const successful =
        results.filter(
          result =>
            result.status ===
            "Sent"
        ).length;

      const failed =
        results.length -
        successful;

      return safeReply(
        message,
        [
          `${EMOJIS.success} Global announcement processed.`,
          "",
          `Servers reached: **${successful}**`,
          `Servers failed: **${failed}**`
        ].join("\n")
      );
    }


    if (
      command ===
      "forceviewlogs"
    ) {
      if (
        !isOwner(
          message.author
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} No permission; this command only works for the bot developer.`
        );
      }

      try {
        if (
          !fs.existsSync(
            logsPath
          )
        ) {
          return safeReply(
            message,
            "No logs exist yet."
          );
        }

        const logs =
          fs.readFileSync(
            logsPath,
            "utf8"
          );

        const chunks = [];

        for (
          let i = 0;
          i < logs.length;
          i += 1900
        ) {
          chunks.push(
            logs.slice(
              i,
              i + 1900
            )
          );
        }

        for (
          const chunk of
          chunks
        ) {
          await message.author.send(
            `\`\`\`text\n${chunk}\n\`\`\``
          );
        }

        return safeReply(
          message,
          `${EMOJIS.success} Logs sent to your DMs.`
        );
      } catch (
        error
      ) {
        console.error(
          error
        );

        return safeReply(
          message,
          `${EMOJIS.error} Failed to send logs. Your DMs may be closed.`
        );
      }
    }


    if (
      command ===
      "config"
    ) {
      if (
        !hasPermission(
          message,
          PermissionsBitField.Flags.ManageGuild
        )
      ) {
        return safeReply(
          message,
          `${EMOJIS.error} You need the **Manage Server** permission.`
        );
      }

      const config =
        loadConfig();

      if (
        !config[guildId]
      ) {
        config[guildId] = {
          disabled: [],
          flagSystem:
            true
        };
      }

      const subcommand =
        args[0]?.toLowerCase();


      if (
        subcommand ===
        "flags"
      ) {
        const state =
          args[1]?.toLowerCase();

        if (
          state !==
            "enable" &&
          state !==
            "disable"
        ) {
          return safeReply(
            message,
            "Usage: `!config flags enable` or `!config flags disable`"
          );
        }

        config[guildId].flagSystem =
          state ===
          "enable";

        saveConfig(
          config
        );

        return safeReply(
          message,
          state ===
            "enable"
            ? `${EMOJIS.success} Flag system enabled.`
            : `${EMOJIS.warning} Flag system disabled.`
        );
      }


      if (
        subcommand ===
        "command"
      ) {
        const target =
          args[1]?.toLowerCase();

        const state =
          args[2]?.toLowerCase();

        if (
          !target ||
          !state
        ) {
          return safeReply(
            message,
            "Usage: `!config command <command> enable/disable`"
          );
        }

        if (
          state !==
            "enable" &&
          state !==
            "disable"
        ) {
          return safeReply(
            message,
            "State must be `enable` or `disable`."
          );
        }

        if (
          state ===
          "disable"
        ) {
          if (
            !config[
              guildId
            ].disabled.includes(
              target
            )
          ) {
            config[
              guildId
            ].disabled.push(
              target
            );
          }
        } else {
          config[
            guildId
          ].disabled =
            config[
              guildId
            ].disabled.filter(
              commandName =>
                commandName !==
                target
            );
        }

        saveConfig(
          config
        );

        return safeReply(
          message,
          state ===
            "disable"
            ? `${EMOJIS.warning} \`${target}\` disabled.`
            : `${EMOJIS.success} \`${target}\` enabled.`
        );
      }


      if (
        subcommand ===
        "status"
      ) {
        const disabled =
          config[
            guildId
          ].disabled;

        const flagStatus =
          config[
            guildId
          ].flagSystem
            ? "Enabled"
            : "Disabled";

        const disabledText =
          disabled.length > 0
            ? disabled
                .map(
                  name =>
                    `\`${name}\``
                )
                .join(", ")
            : "None";

        return safeReply(
          message,
          [
            "**SpectralBot Configuration**",
            "",
            `Flag system: **${flagStatus}**`,
            `Disabled commands: ${disabledText}`
          ].join("\n")
        );
      }

      return safeReply(
        message,
        [
          "**SpectralBot Configuration**",
          "",
          "`!config status`",
          "`!config flags enable`",
          "`!config flags disable`",
          "`!config command <command> enable`",
          "`!config command <command> disable`"
        ].join("\n")
      );
    }

  }
);


async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName(
        "ping"
      )
      .setDescription(
        "Check whether SpectralBot is online."
      ),

    new SlashCommandBuilder()
      .setName(
        "apply"
      )
      .setDescription(
        "Start an NFLBLC application."
      )
  ].map(
    command =>
      command.toJSON()
  );

  const rest =
    new REST({
      version:
        "10"
    }).setToken(
      TOKEN
    );

  try {
    console.log(
      "Registering application commands..."
    );

    await rest.put(
      Routes.applicationCommands(
        CLIENT_ID
      ),
      {
        body:
          commands
      }
    );

    console.log(
      "Application commands registered successfully."
    );
  } catch (
    error
  ) {
    console.error(
      "Failed to register application commands:",
      error
    );
  }
}


client.on(
  "interactionCreate",
  async interaction => {

    if (
      interaction.isButton()
    ) {
      const [
        action,
        applicationId
      ] =
        interaction.customId.split(
          ":"
        );

      if (
        action ===
        "nflblc_accept"
      ) {
        await resolveApplication(
          interaction,
          applicationId,
          "accepted"
        );

        return;
      }

      if (
        action ===
        "nflblc_deny"
      ) {
        await resolveApplication(
          interaction,
          applicationId,
          "denied"
        );

        return;
      }

      return;
    }


    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    if (
      interaction.commandName ===
      "ping"
    ) {
      try {
        await interaction.reply(
          "Pong!"
        );
      } catch (
        error
      ) {
        console.error(
          "Ping command error:",
          error
        );
      }

      return;
    }

    if (
      interaction.commandName ===
      "apply"
    ) {
      try {
        const result =
          await startApplication(
            interaction.user,
            interaction.guild
          );

        if (
          !result.success
        ) {
          if (
            result.reason ===
            "already_active"
          ) {
            await interaction.reply({
              content:
                `${EMOJIS.warning} You already have an active application in your DMs. Please finish your current application before starting a new one.`,
              ephemeral:
                true
            });

            return;
          }

          if (
            result.reason ===
            "dm_failed"
          ) {
            await interaction.reply({
              content:
                `${EMOJIS.error} I couldn't DM you. Please make sure your Discord privacy settings allow DMs from server members.`,
              ephemeral:
                true
            });

            return;
          }

          await interaction.reply({
            content:
              `${EMOJIS.error} Failed to create your application. Please contact the developer and try again later.`,
            ephemeral:
              true
          });

          return;
        }

        await interaction.reply({
          content:
            `${EMOJIS.success} NFLBLC Cup-Series application started. Check your DMs.`,
          ephemeral:
            true
        });
      } catch (
        error
      ) {
        console.error(
          "Application slash command error:",
          error
        );

        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              `${EMOJIS.error} Something went wrong while starting your application.`,
            ephemeral:
              true
          });
        }
      }
    }
  }
);


client.on(
  "error",
  error => {
    console.error(
      "Discord client error:",
      error
    );
  }
);

client.on(
  "warn",
  warning => {
    console.warn(
      "Discord warning:",
      warning
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "Unhandled promise rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "Uncaught exception:",
      error
    );
  }
);


if (
  !CLIENT_ID ||
  CLIENT_ID ===
    "YOUR_CLIENT_ID"
) {
  console.error(
    "ERROR: Set your Discord application/client ID in index.js before starting the bot."
  );

  process.exit(
    1
  );
}

client.login(
  TOKEN
);
