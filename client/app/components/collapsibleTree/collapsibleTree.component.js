import template from './collapsibleTree.component.html';
import controller from './collapsibleTree.controller.js';
import './collapsibleTree.component.scss';

let collapsibleTreeComponent = {
  restrict: 'E',
    bindings: {
        treeData: "<",
        path: "<"
    },
  template: template,
    controller: ["$element", controller]
};

export default collapsibleTreeComponent;
