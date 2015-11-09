//Main application
var priceApp = angular.module('priceHistory', ['ui.bootstrap', 'ngRoute']);

//Routes to each page
priceApp.config(function ($routeProvider) {
    $routeProvider.when("/", {
        templateUrl: 'ListOfDeals.html',
        controller: 'dealsController',
        resolve: {
            deals: function (Scopes) {
                return Scopes.getItems();
            }
        }
    }).
    when('/ItemDetails/:itemNumber', {
        templateUrl: 'ItemDetails.html',
        controller: "productController",
        resolve: {
            deals: function (Scopes) {
                return Scopes.getItems();
            }
        }
    }).
    when('/priceHistory', {
        templateUrl: "PriceChart.html",
        controller: "chartController"
    }).
    when('/ItemDetails', {
        templateUrl: 'ItemDetails.html',
        controller: "productController",
        resolve: {
            deals: function (Scopes) {
                return Scopes.getItems();
            }
        }
    });
 
});


//Scopes factory to store values to be referenced by controllers
priceApp.factory('Scopes', function ($rootScope, $http) {
    var mem = {};

    return {
        store: function (key, value) {
            mem[key] = value;
        },
        get: function (key) {
            return mem[key];
        },
        getItems: function () {
            var deals;
            //Retrieve the deals from the list of deals json file
        var promise =    $http.get('json/deals.json').success(function (data) {
                deals = data;

                //Todays date
                var todaysDate = new Date();
                var dateAsString = (todaysDate.getMonth() + 1).toString() + "/" + todaysDate.getDate().toString() + "/" + todaysDate.getFullYear().toString()

                //Retreive the prices from the json that stores prices for 1 month for each item
                $http.get('json/csvtojson.json').success(function (data) {

                    //loop through the deals
                    for (var deal in deals) {

                        //get the deal for that index
                        var dealToModify = deals[deal];

                        //search for all objects in the prices array that have item numbers matching the deal  item number
                        var itemprices = data.filter(function (item) {
                            if (item.Item_nbr == dealToModify.item_number) {
                                return item;
                            }
                        });

                        //loop through the filtered prices array got in the previous step
                        for (var itemprice in itemprices) {

                            //find todays price
                            if (itemprices[itemprice].date == dateAsString) {
                                dealToModify.item_saleprice = parseFloat(itemprices[itemprice].w_price).toFixed(2),toString();
                          
                            }
                        };

                        //determine if todays price is the lowest among the all the prices associated with this item
                        for (var itemprice in itemprices) {
                            if (itemprices[itemprice].w_price != "") {
                                if (parseFloat(itemprices[itemprice].w_price) < parseFloat(dealToModify.item_saleprice)) {
                                    dealToModify.item_lowprice = "false";
                                    break;
                                }
                            }
                        }
                    };
          
                });
                 return deals;
            });
        return promise;
        }
    };
});

//modal options
//Controllers
//1st page controller which has a div that will load 2nd, 3rd and chart page in the same div. this is called SPA - Single Page architecture.
    priceApp.controller("priceController", function ($scope, $window) {

        //interval for the slide to change
        $scope.myInterval = 5000;

        //Search Button logic
        $scope.searchWalmart = function (querySearch) {
            $window.open("http://www.walmart.com/search/?query=" + querySearch, "_blank");
        }
    });

    //Deals controller - in charge of displaying the deals
    priceApp.controller("dealsController", function ($scope, $http, deals, $location) {

        $scope.deals = deals.data;

        //process button click that calls this function and redirect to chart controller that will show the price history
        $scope.seePriceChart = function (itemNumber) {
            Scopes.store('ItemNumber', itemNumber);
            $location.path("/priceHistory");
        };

        
});
    //Product controller- in charge of display product details
    priceApp.controller("productController", function ($scope, $http, $routeParams, $sce, Scopes, $location, deals) {

        $scope.items = deals.data;

            //Save the route params in the controller.If route params is empty get the data from the factory
            if ($routeParams.itemNumber) {
                $scope.itemNumber = $routeParams.itemNumber;
            } else {
                $scope.itemNumber = Scopes.get("ItemNumber");
            }

            //function to redirect to the chart page. Before redirecting, save the item number in the Factory. Factories are persistent objects.. but controllers get destroyed everytime you go to the next page.
            $scope.showPriceHistory = function (itemNumber) {
                Scopes.store('ItemNumber', itemNumber);
                $location.path("/priceHistory");
            };
            $scope.goBack = function () {
                $location.path("/")
            };
    });

//modal controller
    priceApp.controller("smsModalController", function($scope, $modalInstance,$http, Scopes)
    {
        $scope.price = 0;
        //Send SMS
        $scope.sendSMS = function (smsNumber) {
         
            $scope.itemName = Scopes.get('ItemName');
            if ($scope.smsBestDeal == true) {
                $http.get("http://smshorizon.co.in/api/sendsms.php?user=moghthalkushal@gmail.com&apikey=5IP5kpbO03ZniTAsWd2t&mobile=" + smsNumber + "&message=Alert! Best Deal Today for " + $scope.itemName + ".&senderid=PriceNotifier&type=txt");
                Scopes.store("Success", "1");
            }
            $modalInstance.close();
        };
    });
    //Chart controller
    priceApp.controller("chartController", function ($scope, Scopes, $http, $location, $modal) {

        //Get the item number from the factory.. 
        $scope.itemNumber = Scopes.get('ItemNumber');

        //Define flags to hide or show the additional line curves 
        $scope.showWalmart = true;
        $scope.showMarket = false;

        //Define SMS Flags
        $scope.showMessage = false;
        $scope.ShowSms = false;
        $scope.Message = false;
        $scope.smsBestDeal = false;
        $scope.smsTodaysPrice = false;
        $scope.smsCutOffPrice = false;

        //define http.get flag
        $scope.getJsonFlag = false;

        //modal
        
        //call the graph function
        showPrices($scope.showWalmart, $scope.showMarket,0);

        //Function that handles go back button
        $scope.goBack = function () {
            $location.path("/ItemDetails")
        };
        

        $scope.showSMS= function (size,name) {
            Scopes.store('ItemName', name);
            var modalInstance = $modal.open({
                templateUrl: 'Smsmodal.html',
                controller: 'smsModalController',
                size: size
                 
            });

            modalInstance.result.then(function (selectedItem) {
                modalInstance.close();
                var successMsg = Scopes.get("Success");
                if (successMsg == "1") {

                    $scope.Message = true;
                }
            });
        };

        
                     //Function that handles redrawing the chart since the options were changed. 
        $scope.redraw = function (showWalmart, showMarket) {

            //if show walmart and show market price are unchecked, issue an error message
            if (showWalmart == false && showMarket == false) {
                $scope.showMessage = true;
                return;
            }

            //get the current options
            $scope.showWalmart = showWalmart;
            $scope.showMarket = showMarket;
            $scope.showMessage = false;

            //Redraw the chart
            showPrices($scope.showWalmart, $scope.showMarket,0);
        };

        $scope.updateChart = function (selectedItem) {
            $scope.selectedItemNumber = $scope.selectedItem.item_number;
            
            showPrices($scope.showWalmart, $scope.showMarket,$scope.selectedItemNumber);
        }
        //Draw the chart
        function showPrices(walmart, market, similarItemNumber) {
            if ($scope.getJsonFlag == false) {
                $http.get('json/deals.json').success(function (data) {

                    //Get the items from the deals file and get the specific item for which the chart is being drawn
                    $scope.items = data;
                    $scope.item = $scope.items[$scope.itemNumber];
                    $scope.categoryItems = [];
                    if ($scope.categoryItems.length == 0) {
                        $scope.categoryItems = $scope.items.filter(function (item) {
                            if (item.item_subcategory == $scope.item.item_subcategory && item.item_number != $scope.item.item_number) {
                                return item;
                            }
                        });
                    }

                    google.setOnLoadCallback(drawChart($scope.item.item_number, walmart, market, similarItemNumber));
                    $scope.getJsonFlag = true;
                });
            } else {
                google.setOnLoadCallback(drawChart($scope.item.item_number, walmart, market, similarItemNumber));
            }
        }

         
        function drawChart(x,showwalmart, showmarket,y) {
            var tabs = new google.visualization.DataTable();
             
            tabs.addColumn('date', 'Date');
            if (showwalmart) {
                tabs.addColumn('number', 'walmart price');
            }
            if (showmarket) {
                tabs.addColumn('number', 'rest of market price');
            }
            if (y > 0) {
                tabs.addColumn('number', 'walmart price for ' + $scope.selectedItem.item_name);
            }
            $.getJSON('json/csvtojson.json', function (data) {
                
                drawTable(data, x,showwalmart,showmarket,y);
                var options = {
                    title: 'Price History',
                    curveType: 'function',
                    legend: { position: 'bottom' },
                    vAxis: { minValue: 0, maxValue:5 }
                };

                var chart = new google.visualization.LineChart(document.getElementById('curve_chart'));
                 chart.draw(tabs, options);
            });

           

            function drawTable(data, x,showwalmart,showmarket,y) {
                
                z = (x - 1) * 21
                simItemData = 0;
                if (y > 0) {
                    simItemData = (y - 1) * 21;
                }
                for (var i = 0; i < 14; i++) {
                    drawRow_type1(data[z + i], showwalmart, showmarket,y,data[simItemData+i]);
                   
                }
                for (var i = 14; i < 21; i++) {
                    drawRow_type2(data[z + i], showwalmart, showmarket,y,data[simItemData+i]);
                    
                }

                // }
            }

            function drawRow_type1(rowData,showwalmart,showmarket,y,simRowData) {
             
                var s = rowData.date;
                var day = s.split('/')[1];
                var month = s.split('/')[0];
                var year = s.split('/')[2];
            
                var d1 = new Date(s.split('/')[2], s.split('/')[0] - 1, s.split('/')[1], 0, 0, 0);
                var arrayToAdd = [d1]
                if (showwalmart) {
                    var d2 = parseFloat(rowData.w_price);
                    arrayToAdd.push(d2)
                }
                if (showmarket) {
                    var d3 = parseFloat(rowData.rm_price);
                    arrayToAdd.push(d3)
                }
                if (y > 0) {
                    var d4 = parseFloat(simRowData.w_price);
                    arrayToAdd.push(d4)
                }

           
                tabs.addRows([arrayToAdd]);
                
            }

            function drawRow_type2(rowData,showwalmart,showmarket,y,simRowData) {
              
                var boo = new Date(rowData.date.split('/')[2], rowData.date.split('/')[0] - 1, rowData.date.split('/')[1],0,0,0);
                var arrayToAdd1 = [boo]
                if (showwalmart) {
                    var a = parseFloat(rowData.w_intercept) + parseFloat(rowData.w_price_yday_coeff) * parseFloat(rowData.w_price_lag) + parseFloat(rowData.w_units_coeff) * parseFloat(rowData.w_units) + parseFloat(rowData.w_dollars_coeff) * parseFloat(rowData.w_dollars);
                    arrayToAdd1.push(a);
                }
                 
                if (showmarket) {
                    var b = parseFloat(rowData.rm_intercept) + parseFloat(rowData.rm_price_lag_coeff) * parseFloat(rowData.rm_price_lag) + parseFloat(rowData.rm_units_coeff) * parseFloat(rowData.rm_units) + parseFloat(rowData.rm_dollars_coeff) * parseFloat(rowData.rm_dollars);
                    arrayToAdd1.push(b);
                }
                if (y > 0) {
                    var c = parseFloat(simRowData.w_intercept) + parseFloat(simRowData.w_price_yday_coeff) * parseFloat(simRowData.w_price_lag) + parseFloat(simRowData.w_units_coeff) * parseFloat(simRowData.w_units) + parseFloat(simRowData.w_dollars_coeff) * parseFloat(simRowData.w_dollars);
                    arrayToAdd1.push(c);
                }
                tabs.addRows([arrayToAdd1]);
                 
            } 


        }
    });

    //Display html text in the page.
    priceApp.filter('unsafe', function ($sce) { return $sce.trustAsHtml; });

