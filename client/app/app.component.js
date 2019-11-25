import template from './app.component.html';
import './app.component.scss';

const AppComponent = {
    template,
    controller: class AppCtrl {
        constructor() {
            this.name = "app"
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
    }
};

export default AppComponent;
