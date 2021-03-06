'use strict';
const Generator = require('yeoman-generator');
const _chalk = require('chalk');
const _yosay = require('yosay');

const _prompts = require('../../utils/prompts');
const _consts = require('../../utils/constants');
const _package = require('../../package.json');

module.exports = class extends Generator {
    /**
     * Shows a the title of the sub generator, and a brief description.
     */
    showTitle() {
        this.log(_consts.SEPARATOR);

        if (!this.options.title) {
            const title = `${_consts.GENERATOR_NAME} v${_package.version}`;
            const subTitle = 'Add new API to chart';
            this.log(
                _yosay(
                    `Helm Chart Generator.\n${_chalk.red(
                        title
                    )}\n${_chalk.yellow(subTitle)}`
                )
            );
        } else {
            this.log(this.options.title);
        }
    }

    /**
     * Gather basic project information.
     */
    gatherProjectInfo() {
        return _prompts
            .getProjectInfo(this, false)
            .then(() => {
                return _prompts.getAuthorInfo(this, false);
            })
            .then(() => {
                return this.prompt([
                    {
                        type: 'input',
                        name: 'apiName',
                        message: 'Api name?',
                        default: 'my-api'
                    },
                    {
                        type: 'input',
                        name: 'apiHost',
                        message: 'Api host (leave empty if no host)?',
                        validate: (input, answers) => {
                            const pattern = /^([a-zA-Z0-9][a-zA-Z0-9-_]*\.)*[a-zA-Z0-9]*[a-zA-Z0-9-_]*[[a-zA-Z0-9]+$/;
                            if (input.length === 0 || input.match(pattern)) {
                                return true;
                            }
                            return 'Invalid api hostname. Must be a valid DNS subdomain, or must be empty';
                        }
                    },
                    {
                        type: 'input',
                        name: 'apiPath',
                        message: 'Api path?',
                        filter: (answer) => {
                            if(answer.indexOf('/') !== 0) {
                                return `/${answer}`;
                            }
                            return answer;
                        },
                        default: '/'
                    },
                    {
                        type: 'input',
                        name: 'apiIngressClass',
                        message: 'Ingress class (leave empty if none)?',
                    },
                    {
                        type: 'confirm',
                        name: 'apiTlsEnabled',
                        message: 'Enable TLS access?',
                        default: true
                    },
                    {
                        type: 'input',
                        name: 'apiTlsHost',
                        message: 'Hostname for TLS access?',
                        default: (answers) => answers.apiHost,
                        when: (answers) => answers.apiTlsEnabled
                    },
                    {
                        type: 'input',
                        name: 'apiTlsSecret',
                        message: 'Kubernetes secret for TLS (leave empty if none)?',
                        when: (answers) => answers.apiTlsEnabled
                    },
                    {
                        type: 'input',
                        name: 'apiImage',
                        message: 'Api image?',
                        validate: (input, answers) => {
                            if (input.length >= 0) {
                                return true;
                            }
                            return 'Please provide a valid API image name';
                        }
                    }
                ]).then((props) => {
                    this.props = this.props || {};
                    Object.keys(props).forEach((key) => {
                        this.props[key] = props[key];
                    });
                });
            });
    }

    /**
     * Creates project files
     */
    createProjectFiles() {
        const { apiName } = this.props;
        [
            'templates/_api/config.yaml',
            'templates/_api/deployment.yaml',
            'templates/_api/service.yaml',
            'templates/_api/ingress.yaml'
        ].forEach((srcFile) => {
            const destFile = srcFile
                .replace(/^_/, '.')
                .replace(/\/_api\//, `/${apiName}/`);

            this.fs.copyTpl(
                this.templatePath(srcFile),
                this.destinationPath(destFile),
                this.props
            );
        });

        this.fs.copyTpl(
            this.templatePath('data/_config.json'),
            this.destinationPath(`data/${apiName}-config.json`),
            this.props
        );
    }

    /**
     * Update the helper template with some definitions specific to the API.
     */
    updateHelperTemplates() {
        const { apiName, apiImage, projectName } = this.props;
        const helperFile = this.destinationPath('templates/_helpers.tpl');
        const helperTemplate = Buffer.from(`
{{/*
Container image for ${apiName}
*/}}
{{- define "${projectName}.${apiName}.image" }}${apiImage}{{- end -}}
`);

        this.fs.copy(helperFile, helperFile, {
            process: (content) => {
                return Buffer.concat([content, helperTemplate]);
            }
        });
    }

    /**
     * Display completed message with future actions.
     */
    finish() {
        const messages = [
            '',
            _consts.SEPARATOR,
            ` Kubernetes resources for your api have been added.                             `,
            ` Optional lifecycle hooks can be created by running:                            `,
            '',
            `   yo ${
                _consts.GENERATOR_NAME
            }:hook                                            `,
            _consts.SEPARATOR,
            ''
        ];

        messages.forEach((line) => this.log(line));
    }
};
