# Changes

This fork has some features designed for the workflow we use.

# Soft Breaks

From [hollow](https://github.com/hollow/markdown-confluence) adds support for Soft Breaks

# Jira

Originally from [derari](https://github.com/derari/markdown-confluence) but extended.

Replaces text that matches a JIRA ticket format `(^(.*?)[:space:]?JIRA ?#? ?: ?([A-Z]+-[0-9]+)[:space:]?(.*?)$)` with a Jira Inline card.  This points to the Jira URL specified by the JiraUrl setting.

# Kroki

Replaces code blocks that start kroki- with previously rendered images - this does not render them itself and assumes they have already been made available in the build area with a specific file name format (`<basename of md file>_<sequence>.svg`).  This is handled in our pipelines.

# To add?

Consider: https://github.com/markdown-confluence/markdown-confluence/commit/6de49e7057757d6a404817729870c17443124610 excerpts and properties.
