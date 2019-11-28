import { store } from 'react-easy-state'

import post from '../stores/PostStore'

import { authStore } from './authStore'
import { searchStore } from './searchStore'
import { Platform } from 'react-native-platform'
import { isReactSnap } from './shared'

export const findTasksStore = store({
    city: '',

    placemarks: [],

    category: '',

    subcategory: '',

    loading: false,

    actions: {
        getValue: null,
        setValue: null
    },

    showMap: false,

    options: {},

    tasks: [],

    page: 1,

    size: 20,

    total: 0,

    taskCount: 0,

    priceMin: 0,

    priceMax: 99999999,

    cost: [0, 99999999],

    startDate: null,

    endDate: null,

    endDateOpen: false,

    end: false,

    refreshing: false,

    initTimeRange: [1e18, 0],

    sortSearch: 'new',

    isViewOnlyResponse: false,

    addressForm: {
        isRemotePlace: false,
        isExecutorPlace: false,
        isCustomerPlace: false
    },

    workAddressKey: '+',

    timeRange: [0, 30],

    taskStep: 'all',

    customerID: 0,

    executorID: 0,

    isMyTasksRoute: false,

    isViewOnlyResponseChange: () => {
        findTasksStore.isViewOnlyResponse = !findTasksStore.isViewOnlyResponse
    },
    resetMyTask: () => {
        findTasksStore.tasks = []
        findTasksStore.total = 0
        findTasksStore.loading = false
        findTasksStore.end = false
        findTasksStore.page = 1
        findTasksStore.refreshing = false
        findTasksStore.taskStep = 'all'
    },
    tabPage: 'customer',
    setTaskSide: value => {
        findTasksStore.tabPage = value
        if (value === 'executor') {
            findTasksStore.executorID = authStore.user && authStore.user.id
            findTasksStore.customerID = null
        } else if (value === 'customer') {
            findTasksStore.executorID = null
            findTasksStore.customerID = authStore.user && authStore.user.id
        } else {
            findTasksStore.executorID = null
            findTasksStore.customerID = null
        }
    },

    setTaskStep: value => {
        findTasksStore.taskStep = value
    },

    setCustomerID: value => {
        findTasksStore.customerID = value
    },

    setExecutorID: value => {
        findTasksStore.executorID = value
    },

    handleRefresh: async () => {
        findTasksStore.page = 1
        findTasksStore.refreshing = true
        findTasksStore.end = false
        await findTasksStore.find(true, true)
    },

    handleLoadMore: async () => {
        if (findTasksStore.loading || findTasksStore.end) null
        else await findTasksStore.find(true, true)
    },

    onAddress: e => {
        findTasksStore.addressForm = e
    },

    onSortSearch: e => {
        findTasksStore.sortSearch = e
    },

    onInitTime: e => {
        findTasksStore.initTimeRange[0] = Date.now() - e[0] * 86400000
        findTasksStore.initTimeRange[1] = Date.now() - e[1] * 86400000
        findTasksStore.timeRange = e
    },

    disabledStartDate: startDate => {
        const endDate = findTasksStore.endDate
        if (!startDate || !endDate) return false
        return startDate.valueOf() > endDate.valueOf()
    },

    disabledEndDate: endDate => {
        const startDate = findTasksStore.startDate
        if (!endDate || !startDate) return false
        return endDate.valueOf() <= startDate.valueOf()
    },

    onStartDateOpenChange: open => {
        if (!open) findTasksStore.endDateOpen = true
    },

    onEndDateOpenChange: open => {
        findTasksStore.endDateOpen = open
    },

    onStartDateChange: value => {
        findTasksStore.startDate = value
    },

    onEndDateChange: value => {
        findTasksStore.endDate = value
    },

    initPage: async (side, step) => {
        if (isReactSnap) return null
        //if (params.category) findTasksStore.category = params.category
        findTasksStore.loading = true

        if (findTasksStore.isMyTasksRoute) {
            findTasksStore.resetMyTask()
            if (Platform.OS !== 'web') {
                findTasksStore.setTaskSide(side)
                findTasksStore.setTaskStep(step)
            } else {
                findTasksStore.setTaskSide('customer')
                findTasksStore.setTaskStep('current')
            }
            if (Platform.OS === 'web') return findTasksStore.find()
            else return findTasksStore.find(true, true)
        } else {
            findTasksStore.setTaskSide(null)
            findTasksStore.setTaskStep('current')
        }

        try {
            const { user } = authStore
            if (!user)
                if (Platform.OS === 'web') return findTasksStore.find()
                else return findTasksStore.find(false, true)
            const res = await post.account_get({})
            if (!res || !res.data) return null
            const {
                isRemotePlace,
                isExecutorPlace,
                isCustomerPlace,
                addressMap,
                workAddress,
                radius,
                searchScale,
                priceMin,
                priceMax
            } = res.data
            findTasksStore.loading = true
            findTasksStore.priceMin = priceMin
            findTasksStore.priceMax = priceMax
            findTasksStore.addressForm = {
                isRemotePlace,
                isExecutorPlace,
                isCustomerPlace,
                addressMap: addressMap || {},
                workAddress: workAddress || {},
                radius,
                searchScale
            }
            findTasksStore.workAddressKey =
                findTasksStore.workAddressKey === '+' ? '-' : '+'
            if (Platform.OS === 'web') findTasksStore.find()
            else findTasksStore.find(false, true)
        } catch (error) {
            console.log(error)
        }
    },

    find: async (same, inc) => {
        findTasksStore.loading = true
        if (!same) {
            findTasksStore.page = 1
            // findTasksStore.tasks = []
        }

        const {
            isExecutorPlace,
            isCustomerPlace,
            isRemotePlace,
            workAddress,
            radius,
            searchScale,
            addressMap
        } = findTasksStore.addressForm

        // const serviceForSearch = searchStore.searchValue oldversion
        let serviceForSearch = ''
        const { category, subcategory } = searchStore

        if (category != undefined && subcategory != undefined)
            serviceForSearch = subcategory
        else if (category != undefined) serviceForSearch = category

        try {
            const { data } = await post.tasks_get_list(
                findTasksStore.isMyTasksRoute
                    ? {
                          isTaskResponse: false,
                          serviceForSearch: null,
                          isExecutorPlace: false,
                          isCustomerPlace: false,
                          isRemotePlace: false,
                          addressMap: {},
                          workAddress: {},
                          radius: null,
                          searchScale: 'country',

                          priceMin: 0,
                          priceMax: 99999999,
                          limit: findTasksStore.size,
                          offset:
                              Math.max(0, findTasksStore.page - 1) *
                              Math.max(1, findTasksStore.size),
                          startDate: 0,
                          endDate: 1e18,
                          initTimeRange: [1e18, 0],
                          sortSearch: 'new',

                          taskStep: findTasksStore.taskStep,
                          customerID: findTasksStore.customerID,
                          executorID: findTasksStore.executorID
                      }
                    : {
                          isTaskResponse: findTasksStore.isViewOnlyResponse,
                          serviceForSearch,
                          isExecutorPlace,
                          isCustomerPlace,
                          isRemotePlace,
                          addressMap: addressMap || {},
                          workAddress: workAddress || {},
                          radius,
                          searchScale,

                          priceMin:
                              findTasksStore.cost[0] !== undefined
                                  ? findTasksStore.cost[0]
                                  : 0,
                          priceMax:
                              findTasksStore.cost[1] !== undefined
                                  ? findTasksStore.cost[1]
                                  : 99999999,
                          limit: findTasksStore.size,
                          offset:
                              Math.max(0, findTasksStore.page - 1) *
                              Math.max(1, findTasksStore.size),
                          startDate: findTasksStore.startDate
                              ? findTasksStore.startDate.valueOf()
                              : 0,
                          endDate: findTasksStore.endDate
                              ? findTasksStore.endDate.valueOf()
                              : 1e18,
                          initTimeRange: findTasksStore.initTimeRange,
                          sortSearch: findTasksStore.sortSearch,

                          taskStep: findTasksStore.taskStep,
                          customerID: findTasksStore.customerID,
                          executorID: findTasksStore.executorID
                      }
            )

            const { count, findTasksList } = data
            findTasksStore.placemarks = []
            findTasksStore.total = count
            findTasksStore.createPlacemarks(findTasksList)

            if (inc) {
                ;(findTasksStore.tasks =
                    findTasksStore.page === 1
                        ? findTasksList
                        : [...findTasksStore.tasks, ...findTasksList]),
                    (findTasksStore.loading = false)
                findTasksStore.refreshing = false
                findTasksStore.page = findTasksStore.page + 1
                findTasksStore.end = findTasksList.length > 0 ? false : true
            } else {
                findTasksStore.tasks = findTasksList
            }
        } catch (error) {
            console.log(error)
        }
    },

    onPageChange: (page, size) => {
        findTasksStore.page = page
        findTasksStore.size = size
        findTasksStore.find(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    onSizeChange: (page, size) => {
        findTasksStore.page = 1
        findTasksStore.size = size
        findTasksStore.find(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    },

    onCategoryChange: value => {
        findTasksStore.category = value
        findTasksStore.subcategory = ''
    },

    onSubcategoryChange: value => {
        findTasksStore.subcategory = value
    },

    createPlacemarks: tasks => {
        const placemarks = []
        for (const task of tasks) {
            const id = task.id
            if (!task.addressMap || !task.addressMap['1']) continue
            const lat = parseFloat(task.addressMap['1'].geo_lat)
            const lon = parseFloat(task.addressMap['1'].geo_lon)
            if (
                lat == null ||
                lon == null ||
                lat == NaN ||
                lon == NaN ||
                lat == undefined ||
                lon == undefined ||
                !lon ||
                !lat
            )
                continue

            placemarks.push([
                [lat, lon],
                {
                    balloonContentHeader:
                        `<a href = "#">${task.subcategory}</a><br>` +
                        `<span class="description">${task.category}</span>`,
                    balloonContentBody: `<b>${task.publicDescription}</b>`,
                    hintContent: `<b>${task.publicDescription}</b>`,
                    balloonContentFooter: `<a href="/task?id=${id}">Перейти к заданию</a>`,
                    clusterCaption: `<a href = "#">${task.category}</a><br>`
                }
            ])
        }
        findTasksStore.placemarks = placemarks
        findTasksStore.loading = false
    },

    switchMap: () => {
        findTasksStore.showMap = !findTasksStore.showMap
    },

    onCostChange: e => {
        findTasksStore.cost = e.target.range
    },

    onOptionChange: e => {
        const { id, value, checked, range } = e.target
        if (range !== undefined) {
            findTasksStore.options[id] = range
        } else if (checked !== undefined) {
            findTasksStore.options[id] = checked
        } else {
            findTasksStore.options[id] = value
        }
    }
})
