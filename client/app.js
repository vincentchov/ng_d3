/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */

angular.module("app", []);

angular.module("app").controller("MainCtrl", [
    "$scope",
    function() {
        this.diagramData = [
            {
                name: "Top Level",
                parent: "null",
                children: [
                    {
                        name: "Level 2: A",
                        parent: "Top Level",
                        children: [
                            {
                                name: "Son of A",
                                parent: "Level 2: A"
                            },
                            {
                                name: "Daughter of A",
                                parent: "Level 2: A"
                            }
                        ]
                    },
                    {
                        name: "Level 2: B",
                        parent: "Top Level"
                    }
                ]
            }
        ];

        this.originalDiagramData = [];

        this.path = ["Top Level", "Level 2: A", "Son of A"];
    }
]);
