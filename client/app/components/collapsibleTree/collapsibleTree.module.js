import angular from 'angular';
import collapsibleTreeComponent from './collapsibleTree.component';

const collapsibleTreeModule = angular.module('collapsibleTree', [])
  .component('collapsibleTree', collapsibleTreeComponent);
export default collapsibleTreeModule;